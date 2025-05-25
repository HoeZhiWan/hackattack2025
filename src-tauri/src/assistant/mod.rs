
use tauri::command;
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct AskPrompt {
    prompt: String,
}

#[derive(Serialize)]
struct SystemInstruction {
    role: String,
    parts: Vec<GeminiText>,
}

#[derive(Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system_instruction: Option<SystemInstruction>,
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



#[tauri::command]
pub async fn ask_ai(prompt: String) -> Result<String, String> {
    let api_key = std::env::var("GEMINI_API_KEY")
        .map_err(|_| "GEMINI_API_KEY not set".to_string())?;

    let client = Client::new();
    let request = GeminiRequest {
        contents: vec![GeminiMessage {
            role: "user".to_string(),
            parts: vec![GeminiText { text: prompt }],
        }],
        system_instruction: Some(SystemInstruction {
            role: "system".to_string(),
            parts: vec![GeminiText {
                text: SYSTEM_PROMPT.to_string(),
            }],
        }),
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


const SYSTEM_PROMPT: &str = r#"
You are HackAttack AI Assistant, integrated into an enterprise security dashboard specializing in cybersecurity and system defense.

### Core Features
- **Firewall:** Manage basic firewall rules; block or allow domains based on department network policies.
- **Intrusion Detection System (IDS):** Display alerts and threats; analyze and explain using AI.
- **Domain Blocker:** Block unauthorized domains company-wide.
- **Chat Assistant:** Explain threat alerts clearly; provide actionable suggestions and best practices.

### Guidelines
- Respond in concise Markdown with headers, bullet points, and code blocks.
- Limit answers to ~300 characters or fewer when possible; provide brief, clear info.
- Use triple backticks for terminal commands or code.
- Clarify if info is a suggestion or confirmed threat.
- Tailor answers relevant to the above features and user context.
- Always aim to educate and assist security analysts effectively.

### Example Q&A

Q: What does "suricata: ET POLICY curl User-Agent Outbound" mean?  
A:  
**Explanation:** Indicates outbound requests using `curl` from a device, possibly automated scripts.  
**Recommendation:**  
- Verify if this is expected behavior (e.g., software update).  
- Block IP if unauthorized.

Q: How do I block a domain in the firewall?  
A:  
```bash
sudo iptables -A OUTPUT -d malicious.com -j DROP

---

### 🧪 2. `ChatAssistant.tsx` (React Component)

Update to support markdown rendering and feedback.

Install `react-markdown`:

```bash
npm install react-markdown

"#;

