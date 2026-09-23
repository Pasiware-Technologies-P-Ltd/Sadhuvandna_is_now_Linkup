const fs = require('fs');
const https = require('https');

const ENV_FILE = '.env';
const TRANSLATIONS_FILE = 'src/localization/translations.ts';

const envContent = fs.readFileSync(ENV_FILE, 'utf8');
const match = envContent.match(/EXPO_PUBLIC_GEMINI_API_KEY=([^\r\n]+)/);
if (!match) {
    console.error("No Gemini API key found in .env!");
    process.exit(1);
}
const API_KEY = match[1].trim();

const targetLanguages = [
    { code: 'ur', name: 'Urdu' },
    { code: 'te', name: 'Telugu' },
    { code: 'kn', name: 'Kannada' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'or', name: 'Odia' },
    { code: 'as', name: 'Assamese' },
];

async function translateWithGemini(prompt) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
            }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let resData = '';
            res.on('data', (chunk) => { resData += chunk; });
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`API Error ${res.statusCode}: ${resData}`));
                }
                try {
                    const json = JSON.parse(resData);
                    let text = json.candidates[0].content.parts[0].text;
                    // Extract json from markdown code block if present
                    if (text.includes('```json')) {
                        text = text.split('```json')[1].split('```')[0].trim();
                    } else if (text.includes('```')) {
                        text = text.split('```')[1].split('```')[0].trim();
                    }
                    resolve(JSON.parse(text));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function run() {
    console.log("Reading translations.ts...");
    let content = fs.readFileSync(TRANSLATIONS_FILE, 'utf8');
    
    // Extract English dictionary
    const enMatch = content.match(/en:\s*\{([\s\S]*?)\},\s*hi:/);
    if (!enMatch) {
        console.error("Could not find English translations block!");
        return;
    }
    
    const enBlock = "{" + enMatch[1] + "}";
    
    // Convert JS object string to actual JS object
    // Using Function is safe here since we control the local file
    const enObj = (new Function(`return ${enBlock}`))();
    
    console.log(`Found ${Object.keys(enObj).length} keys in English.`);

    for (const lang of targetLanguages) {
        console.log(`\nTranslating to ${lang.name}... Please wait.`);
        const prompt = `Translate the following JSON values to ${lang.name}. Ensure high accuracy and natural phrasing. Keep the JSON structure identical and do NOT translate the keys. Return ONLY valid JSON, no markdown.\n\n${JSON.stringify(enObj, null, 2)}`;
        
        try {
            const translatedObj = await translateWithGemini(prompt);
            console.log(`Successfully translated to ${lang.name}!`);
            
            // Format the new block
            let newBlockStr = `    ${lang.code}: {\n`;
            for (const key in translatedObj) {
                // escape quotes
                const val = translatedObj[key].replace(/"/g, '\\"');
                newBlockStr += `        ${key}: "${val}",\n`;
            }
            newBlockStr += `    },`;
            
            // Find where this language block is in the file
            const langRegex = new RegExp(`    ${lang.code}:\\s*\\{[\\s\\S]*?\\},`, 'g');
            
            if (content.match(langRegex)) {
                content = content.replace(langRegex, newBlockStr);
            } else {
                console.log(`Could not find ${lang.code} block in file to replace.`);
            }
        } catch (e) {
            console.error(`Error translating ${lang.name}:`, e.message);
        }
    }

    fs.writeFileSync(TRANSLATIONS_FILE, content);
    console.log("\nAll translations completed! Updated translations.ts successfully.");
}

run();
