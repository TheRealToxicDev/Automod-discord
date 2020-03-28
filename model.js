/*
A lot of the code in this file was taken from github/tensorflow/tfjs-models and modified by me to optimize it for this usecase.
Massive thank you to tensorflow for open sourcing the code and letting us use it.
*/

const tf = require("@tensorflow/tfjs");
require("@tensorflow/tfjs-node");

let model = (function() {
    console.log("Loading Toxicity Model");
    tf.loadGraphModel("https://storage.googleapis.com/tfjs-models/savedmodel/toxicity/model.json")
    .then(graphModel => {
        model = graphModel;
        console.log("Loaded Toxicity Model");
    });
})();

let tokenizer = (function() {
    console.log("Loading USE Model");
    tf.util.fetch("https://storage.googleapis.com/tfjs-models/savedmodel/universal_sentence_encoder/vocab.json")
    .then(vocabulary => {
        return vocabulary.json();
    })
    .then(vocabulary => {
        tokenizer = new Tokenizer(vocabulary);
        console.log("Loaded USE Model");
    })
    .catch(console.error);
})();

class TrieNode {
    constructor(key) {
        this.key = key;
        this.parent = null;
        this.children = {};
        this.end = false;
    }

    getWord() {
        const output = [];
        let node = this;
        while (node !== null) {
            if (node.key !== null) {
                output.unshift(node.key);
            }
            node = node.parent;
        }
        return [output, this.score, this.index];
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode(null);
    }

    findAllCommonPrefixes(ss, node, arr) {
        if (node.end) {
            const word = node.getWord();
            if (ss.slice(0, word[0].length).join("") === word[0].join("")) {
                arr.unshift(word);
            }
        }
        for (const child in node.children) {
            this.findAllCommonPrefixes(ss, node.children[child], arr);
        }
    }

    insert(word, score, index) {
        let node = this.root;
        const symbols = stringToChars(word);
        for (let i = 0; i < symbols.length; i++) {
            if (!node.children[symbols[i]]) {
                node.children[symbols[i]] = new TrieNode(symbols[i]);
                node.children[symbols[i]].parent = node;
            }
            node = node.children[symbols[i]];
            if (i === symbols.length - 1) {
                node.end = true;
                node.score = score;
                node.index = index;
            }
        }
    }

    commonPrefixSearch(ss) {
        const node = this.root.children[ss[0]];
        const output = [];
        if (node) {
            this.findAllCommonPrefixes(ss, node, output);
        } else {
            output.push([[ss[0]], 0, 0]);
        }
        return output;
    }
}

function stringToChars(input) {
    const symbols = [];
    for (let i = 0; i < input.length; i++) {
        symbols.push(input[i]);
    }
    return symbols;
}

function processInput(input) {
    return "\u2581" + input.normalize("NFKC").replace(/ /g, "\u2581");
}

class Tokenizer {
    constructor(vocabulary) {
        this.vocabulary = vocabulary;
        this.trie = new Trie();
        for (let i = 6; i < this.vocabulary.length; i++) {
            this.trie.insert(this.vocabulary[i][0], this.vocabulary[i][1], i);
        }
    }

    encode(input) {
        const nodes = [];
        const words = [];
        const best = [];
        input = processInput(input);
        const symbols = stringToChars(input);
        for (let i = 0; i <= symbols.length; i++) {
            nodes.push({});
            words.push(0);
            best.push(0);
        }
        for (let i = 0; i < symbols.length; i++) {
            const matches = this.trie.commonPrefixSearch(symbols.slice(i));
            for (let j = 0; j < matches.length; j++) {
                const piece = matches[j];
                const obj = { key: piece[0], score: piece[1], index: piece[2] };
                const endPos = piece[0].length;
                if (nodes[i + endPos][i] == null) {
                    nodes[i + endPos][i] = [];
                }
                nodes[i + endPos][i].push(obj);
            }
        }
        for (let endPos = 0; endPos <= symbols.length; endPos++) {
            for (const startPos in nodes[endPos]) {
                const arr = nodes[endPos][startPos];
                for (let j = 0; j < arr.length; j++) {
                    const word = arr[j];
                    const score = word.score + best[endPos - word.key.length];
                    if (best[endPos] === 0 || score >= best[endPos]) {
                        best[endPos] = score;
                        words[endPos] = arr[j].index;
                    }
                }
            }
        }
        const results = [];
        let iter = words.length - 1;
        while (iter > 0) {
            results.push(words[iter]);
            iter -= this.vocabulary[words[iter]][0].length;
        }
        const merged = [];
        let isPreviousUnk = false;
        for (let i = 0; i < results.length; i++) {
            const id = results[i];
            if (!(isPreviousUnk && id === 0)) {
                merged.push(id);
            }
            isPreviousUnk = id === 0;
        }
        return merged.reverse();
    }
}

module.exports = (message, memDB) => {
    return new Promise(resolve => {
        const a = { labels: model.outputs.map(d => { return d.name.split("/")[0]; }) };
        const encodings = [tokenizer.encode(message.content)];
        const indicesArr = [encodings[0].map((d, index) => { return [0, index]; })];
        const indices = tf.tensor2d(indicesArr[0], [indicesArr[0].length, 2], "int32");
        const values = tf.tensor1d(tf.util.flatten(encodings), "int32");
        model.executeAsync({ Placeholder_1: indices, Placeholder: values })
        .then(labels => {
            indices.dispose();
            values.dispose();
            
            const result = labels.map((d, i) => { return { data: d, headIndex: i }; })
            .map(async d => {
                let match = false;
                const prediction = await d.data.data();
                if (Math.max(prediction[0], prediction[1]) > memDB[message.guild.id].settings.threshold) {
                    match = prediction[0] < prediction[1];
                }
                return { label: a.labels[d.headIndex], probabilities: prediction, match: match };
            });

            resolve(result);
        })
        .catch(console.error);
    });
};