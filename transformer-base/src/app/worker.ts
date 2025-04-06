import { pipeline } from "@huggingface/transformers";
import { AutoModelForSeq2SeqLM, AutoModel, AutoTokenizer } from '@huggingface/transformers';

// Supported tasks https://huggingface.co/docs/transformers.js/en/index#natural-language-processing
// Use the Singleton pattern to enable lazy construction of the pipeline.
class PipelineSingleton {
    // Classifier
    // static task = 'text-classification';
    // static model = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

    static task = 'text-generation';
    // text-generation https://huggingface.co/models?pipeline_tag=text-generation&library=transformers.js
    // static model = 'HuggingFaceTB/SmolLM2-1.7B-Instruct';
    // static model = "onnx-community/gemma-3-1b-it-ONNX"
    static model = 'Xenova/distilgpt2';
    static instance = null;

    // NOTE: Requires a `model_quantized.onnx` file to be present otherwie it won't run
    static async getInstance(progress_callback = null) {
        // https://github.com/huggingface/transformers.js/blob/main/src/pipelines.js#L3400
        // NOTE: if you want to change the output size use options in https://huggingface.co/docs/transformers.js/api/pipelines#pipelinestextgenerationpipeline
        this.instance ??= pipeline(this.task, this.model, {
            progress_callback,
            model_file_name: 'model',
            // https://huggingface.co/docs/transformers.js/en/api/generation/configuration_utils
            min_length: 400,
            min_new_tokens: 400,
            max_new_tokens: 800,
            repetition_penalty: 1.5, });
        return this.instance;
    }
}

class ModelSingleton {
    static tokenizer: AutoTokenizer|null = null;
    static model: AutoModel|null = null;
    static async getInstance(model_name: string, progress_callback = null) {
        this.tokenizer ??= await AutoTokenizer.from_pretrained(model_name);
        this.model ??= await AutoModel.from_pretrained(model_name);
        return {model: this.model, tokenizer: this.tokenizer};
    }
}

interface GenerateTextReq {
    input: string;
    model: AutoModel;
    tokenizer: AutoTokenizer;
}

async function generateText(req: GenerateTextReq) {
    let inputs = await req.tokenizer(req.input);
    let output = await req.model.generate(inputs, {min_length: 800, min_new_tokens: 800, max_length: 800, max_new_tokens: 800});
    let decoded = req.tokenizer.decode(output[0]);
    return decoded;
}

// NOTE: Using model doesn't mean that we can get more tokens out of the small models. Just that we can control it more.

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    // // Retrieve the classification pipeline. When called for the first time,
    // // this will load the pipeline and save it for future use.
    // const generation = await PipelineSingleton.getInstance((x: any) => {
    //     // We also add a progress callback to the pipeline so that we can
    //     // track model loading.
    //     console.log(x);
    //     self.postMessage(x);
    // });
    // if (!generation) {return;}

    // // Actually perform the generation
    // const output = await generation(event.data.text);
    const {model, tokenizer} = await ModelSingleton.getInstance('onnx-community/Qwen2.5-1.5B');//'onnx-community/Qwen2.5-0.5B-Instruct');//'Xenova/distilgpt2');
    const output = await generateText({input: event.data.text, model, tokenizer})

    console.log(output);
    // Send the output back to the main thread
    self.postMessage({
        status: 'complete',
        output: output,
    });
});