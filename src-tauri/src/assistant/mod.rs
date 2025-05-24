
use tauri::command;
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct AskPrompt {
    prompt: String,
}

#[derive(Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiMessage>,
}

#[derive(Serialize)]
struct GeminiMessage {
    role: String,
    parts: Vec<GeminiText>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiText {
    text: String,
}

#[derive(Deserialize)]
struct GeminiResponse {
    candidates: Vec<Candidate>,
}

#[derive(Deserialize)]
struct Candidate {
    content: GeminiContent,
}

#[derive(Deserialize)]
struct GeminiContent {
    parts: Vec<GeminiText>,
}

#[command]
pub async fn ask_ai(prompt: String) -> Result<String, String> {
    let api_key = std::env::var("GEMINI_API_KEY")
        .map_err(|_| "GEMINI_API_KEY not set".to_string())?;

    let client = Client::new();
    let request = GeminiRequest {
        contents: vec![GeminiMessage {
            role: "user".to_string(),
            parts: vec![GeminiText { text: prompt }],
        }],
    };

    let res = client
        .post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent")
        .query(&[("key", api_key)])
        .json(&request)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    println!("HTTP Status: {}", res.status());
    
    let json: GeminiResponse = res.json().await.map_err(|e| e.to_string())?;
    
    return if let Some(first) = json.candidates.first() {
        if let Some(part) = first.content.parts.first() {
            
            Ok(part.text.clone())
        } else {
            Err("No content returned".into())
        }
    } else {
        Err("No candidates returned".into())
    }
    
}

