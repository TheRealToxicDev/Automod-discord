/*
A lot of the code in this file was taken from github/tensorflow/tfjs-models and modified by me to optimize it for this usecase.
Massive thank you to tensorflow for open sourcing the code and letting us use it.
*/

const tf = require("@tensorflow/tfjs-node")

let model = (async function() {
    console.log("Loading Toxicity Model")
    model = await tf.loadGraphModel("https://storage.googleapis.com/tfjs-models/savedmodel/toxicity/model.json")
    console.log("Loaded Toxicity Model")
})()

let tokenizer = (function() {
    console.log("Loading USE Model")
    tf.util.fetch("https://storage.googleapis.com/tfjs-models/savedmodel/universal_sentence_encoder/vocab.json").json()
    .then(vocabulary => {
        tokenizer = new Tokenizer(vocabulary)
        console.log("Loaded USE Model")
    })
})()

class TrieNode {
    constructor(key) {
        this.key = key
        this.parent = null
        this.children = {}
        this.end = false
    }

    getWord() {
        let output = []
        let node = this
        while (node !== null) {
            if (node.key !== null) {
                output.unshift(node.key)
            }
            node = node.parent
        }
        return [output, this.score, this.index]
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode(null)
    }

    findAllCommonPrefixes(ss, node, arr) {
        if (node.end) {
            const word = node.getWord()
            if (ss.slice(0, word[0].length).join("") === word[0].join("")) {
                arr.unshift(word)
            }
        }
        for (const child in node.children) {
            this.findAllCommonPrefixes(ss, node.children[child], arr)
        }
    }

    insert(word, score, index) {
        let node = this.root
        const symbols = stringToChars(word)
        for (let i = 0; i < symbols.length; i++) {
            if (!node.children[symbols[i]]) {
                node.children[symbols[i]] = new TrieNode(symbols[i])
                node.children[symbols[i]].parent = node
            }
            node = node.children[symbols[i]]
            if (i === symbols.length - 1) {
                node.end = true
                node.score = score
                node.index = index
            }
        }
    }

    commonPrefixSearch(ss) {
        const node = this.root.children[ss[0]]
        let output = []
        if (node) {
            this.findAllCommonPrefixes(ss, node, output)
        } else {
            output.push([[ss[0]], 0, 0])
        }
        return output
    }
}

function stringToChars(input) {
    let symbols = []
    for (let i = 0; i < input.length; i++) {
        symbols.push(input[i])
    }
    return symbols
}

function processInput(input) {
    const normalized = input.normalize("NFKC")
    return "\u2581" + normalized.replace(/ /g, "\u2581")
}

class Tokenizer {
    constructor(vocabulary) {
        this.vocabulary = vocabulary
        this.trie = new Trie()
        for (let i = 6; i < this.vocabulary.length; i++) {
            this.trie.insert(this.vocabulary[i][0], this.vocabulary[i][1], i)
        }
    }

    encode(input) {
        let nodes = []
        let words = []
        let best = []
        input = processInput(input)
        const symbols = stringToChars(input)
        for (let i = 0; i <= symbols.length; i++) {
            nodes.push({})
            words.push(0)
            best.push(0)
        }
        for (let i = 0; i < symbols.length; i++) {
            const matches = this.trie.commonPrefixSearch(symbols.slice(i))
            for (let j = 0; j < matches.length; j++) {
                const piece = matches[j]
                const obj = { key: piece[0], score: piece[1], index: piece[2] }
                const endPos = piece[0].length
                if (nodes[i + endPos][i] == null) {
                    nodes[i + endPos][i] = []
                }
                nodes[i + endPos][i].push(obj)
            }
        }
        for (let endPos = 0; endPos <= symbols.length; endPos++) {
            for (const startPos in nodes[endPos]) {
                const arr = nodes[endPos][startPos]
                for (let j = 0; j < arr.length; j++) {
                    const word = arr[j]
                    const score = word.score + best[endPos - word.key.length]
                    if (best[endPos] === 0 || score >= best[endPos]) {
                        best[endPos] = score
                        words[endPos] = arr[j].index
                    }
                }
            }
        }
        let results = []
        let iter = words.length - 1
        while (iter > 0) {
            results.push(words[iter])
            iter -= this.vocabulary[words[iter]][0].length
        }
        let merged = []
        let isPreviousUnk = false
        for (let i = 0; i < results.length; i++) {
            const id = results[i]
            if (!(isPreviousUnk && id === 0)) {
                merged.push(id)
            }
            isPreviousUnk = id === 0
        }
        return merged.reverse()
    }
}

module.exports = (message, memDB) => {
    const result = new Promise(async (resolve, reject) => {
        const a = {}
        a.labels = model.outputs.map(d => { return d.name.split("/")[0] })
        a.toxicityLabels = a.labels

        const inputs = [message.content]
        const encodings = inputs.map(d => { return tokenizer.encode(d) })
        const indicesArr = encodings.map((arr, i) => { return arr.map((d, index) => { return [i, index] }) })
        let flattenedIndicesArr = []
        for (let i = 0; i < indicesArr.length; i++) {
            flattenedIndicesArr = flattenedIndicesArr.concat(indicesArr[i])
        }
        const indices = tf.tensor2d(flattenedIndicesArr, [flattenedIndicesArr.length, 2], "int32")
        const values = tf.tensor1d(tf.util.flatten(encodings), "int32")
        const labels = await model.executeAsync({ Placeholder_1: indices, Placeholder: values }) // Test if you can remove this await
        indices.dispose()
        values.dispose()

        const result = labels.map((d, i) => { return { data: d, headIndex: i } })
            .filter(d => { return a.toxicityLabels.indexOf(a.labels[d.headIndex]) > -1 })
            .map(d => {
                const prediction = d.data.data() // Test if dataSync() is needed
                const threshold = memDB[message.guild.id].settings.threshold
                let match = false
                if (Math.max(prediction[0], prediction[1]) > threshold) {
                    match = prediction[0] < prediction[1]
                }
                return { label: a.labels[d.headIndex], results: { probabilities: prediction, match: match } }
            })

        resolve(result)
    })

    return result
}