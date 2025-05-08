import { useState, useEffect } from 'react';
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";

interface ConversationEntry {
  role: 'user' | 'agent';
  text: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function AIChatAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState("");
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [shortAnswers, setShortAnswers] = useState(true);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:5000');
    setWs(websocket);

    websocket.onopen = () => {
      console.log('WebSocket connected');
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'response') {
        setConversationHistory((prev) => [...prev, { role: data.role, text: data.message }]);
        if (isRecording) {
          speakText(data.message);
        }
      } else if (data.type === 'error') {
        setConversationHistory((prev) => [...prev, { role: 'agent', text: data.message }]);
        if (isRecording) {
          speakText(data.message);
        }
      } else if (data.type === 'stockUpdate') {
        handleNutrientCheck(data.itemName);
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket closed');
    };

    if (SpeechRecognitionConstructor) {
      const recognitionInstance: SpeechRecognition = new SpeechRecognitionConstructor();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        const text = event.results[event.results.length - 1][0].transcript;
        setTranscript(text);
        handleAgentInteraction(text, true);
      };

      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        const errorMsg = "Error occurred.";
        setConversationHistory((prev) => [...prev, { role: 'agent', text: errorMsg }]);
        speakText(errorMsg);
        setIsRecording(false);
      };

      recognitionInstance.onend = () => {
        if (isRecording) recognitionInstance.start();
      };

      setRecognition(recognitionInstance);
    } else {
      setConversationHistory((prev) => [
        ...prev,
        { role: 'agent', text: "Speech recognition not supported." },
      ]);
    }

    return () => {
      websocket.close();
      if (recognition) recognition.stop();
    };
  }, [isRecording]);

  const speakText = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const handleVoiceInput = () => {
    if (!recognition) {
      setConversationHistory((prev) => [
        ...prev,
        { role: 'agent', text: 'Speech recognition not supported.' },
      ]);
      return;
    }
    if (isRecording) {
      setIsRecording(false);
      recognition.stop();
      const stopMsg = "Stopped listening.";
      setConversationHistory((prev) => [...prev, { role: 'agent', text: stopMsg }]);
      speakText(stopMsg);
    } else {
      setTranscript('');
      setIsRecording(true);
      recognition.start();
      const startMsg = "Listening...";
      setConversationHistory((prev) => [...prev, { role: 'agent', text: startMsg }]);
      speakText(startMsg);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newHistory = [...conversationHistory, { role: 'user' as const, text: message }];
    setConversationHistory(newHistory);
    setMessage('');

    await handleAgentInteraction(message, false);
  };

  const handleAgentInteraction = async (input: string, isVoice: boolean) => {
    const newHistory = [...conversationHistory, { role: 'user' as const, text: input }];
    setConversationHistory(newHistory);

    if (ws && ws.readyState === WebSocket.OPEN && !isVoice) {
      const prompt = {
        type: 'chat',
        message: input,
        shortAnswers: shortAnswers,
        context: conversationHistory.map(entry => ({ role: entry.role, text: entry.text })),
        instructions: `You are an AI assistant for a kitchen inventory system. Respond based on the following rules:
          - If the user asks to 'check stock' or 'list stock', return a comma-separated list of available stock items with their quantities and units (e.g., "Apples: 5 kg, Bananas: 10 pcs").
          - If the user says 'check nutrients' followed by an item name (e.g., 'check nutrients banana'), provide the nutrient details for that item (calories, protein, carbs, fats) from the nutrient map if available, or say 'No nutrient data available'.
          - If the user says 'suggest meals', provide meal suggestions for breakfast, lunch, and dinner using available stock items, ensuring variety and balanced nutrition.
          - For general queries or unrecognized commands, respond with: 'I can check stock, check nutrients for an item, or suggest meals. Try "check stock", "check nutrients [item]", or "suggest meals".'
          - Use short responses if shortAnswers is true, otherwise provide detailed explanations.
          - Maintain context from the conversation history where relevant.`
      };
      ws.send(JSON.stringify(prompt));
    } else {
      try {
        const endpoint = isVoice ? '/api/voice-agent' : '/api/chat';
        const prompt = {
          question: input,
          shortAnswers: shortAnswers,
          context: conversationHistory.map(entry => ({ role: entry.role, text: entry.text })),
          instructions: `You are an AI assistant for a kitchen inventory system. Respond based on the following rules:
            - If the user asks to 'check stock' or 'list stock', return a comma-separated list of available stock items with their quantities and units (e.g., "Apples: 5 kg, Bananas: 10 pcs").
            - If the user says 'check nutrients' followed by an item name (e.g., 'check nutrients banana'), provide the nutrient details for that item (calories, protein, carbs, fats) from the nutrient map if available, or say 'No nutrient data available'.
            - If the user says 'suggest meals', provide meal suggestions for breakfast, lunch, and dinner using available stock items, ensuring variety and balanced nutrition.
            - For general queries or unrecognized commands, respond with: 'I can check stock, check nutrients for an item, or suggest meals. Try "check stock", "check nutrients [item]", or "suggest meals".'
            - Use short responses if shortAnswers is true, otherwise provide detailed explanations.
            - Maintain context from the conversation history where relevant.`
        };
        const response = await fetch(`http://localhost:5000${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prompt),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get response');

        const responseText = data.response;
        setConversationHistory([...newHistory, { role: 'agent' as const, text: responseText }]);
        if (isVoice) {
          speakText(responseText);
        }

        // Check if the input is a stock check request
        const trimmedInput = input.trim().toLowerCase();
        if (trimmedInput.includes('check stock') || trimmedInput.includes('check nutrients')) {
          const itemName = trimmedInput.replace(/check stock|check nutrients/gi, '').trim();
          if (itemName) {
            handleNutrientCheck(itemName);
          }
        }
      } catch (error) {
        console.error('Error fetching response:', error);
        const errorMsg = 'Request failed.';
        setConversationHistory([...newHistory, { role: 'agent' as const, text: errorMsg }]);
        if (isVoice) {
          speakText(errorMsg);
        }
      }
    }
  };

  const handleNutrientCheck = async (itemName: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      // Simulated nutrient database (replace with actual API or database query if available)
      const nutrientMap: Record<string, { calories: number; protein: number; carbs: number; fats: number }> = {
        banana: { calories: 90, protein: 1.1, carbs: 23, fats: 0.3 },
        broccoli: { calories: 35, protein: 3, carbs: 7, fats: 0.4 },
        'beef steak': { calories: 250, protein: 26, carbs: 0, fats: 15 },
        'salmon fillet': { calories: 200, protein: 25, carbs: 0, fats: 12 },
        rice: { calories: 130, protein: 2.7, carbs: 28, fats: 0.3 },
        potatoes: { calories: 77, protein: 2, carbs: 17, fats: 0.1 },
        milk: { calories: 120, protein: 8, carbs: 12, fats: 5 },
        garlic: { calories: 149, protein: 6.4, carbs: 33, fats: 0.5 },
        apples: { calories: 52, protein: 0.3, carbs: 14, fats: 0.2 },
        tomato: { calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2 },
      };

      const nutrients = nutrientMap[itemName.toLowerCase()] || { calories: 0, protein: 0, carbs: 0, fats: 0 };
      const response = await fetch(`http://localhost:5000/api/stockitems/checkNutrients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: itemName, nutrients }),
      });

      if (response.ok) {
        const updateMsg = `Updated nutrients for ${itemName}: Cal: ${nutrients.calories}, P: ${nutrients.protein}g, C: ${nutrients.carbs}g, F: ${nutrients.fats}g`;
        setConversationHistory((prev) => [...prev, { role: 'agent', text: updateMsg }]);
        if (isRecording) {
          speakText(updateMsg);
        }
      } else {
        const errorMsg = `Failed to update nutrients for ${itemName}.`;
        setConversationHistory((prev) => [...prev, { role: 'agent', text: errorMsg }]);
        if (isRecording) {
          speakText(errorMsg);
        }
      }
    } catch (error) {
      console.error('Nutrient check error:', error);
      const errorMsg = 'Error checking nutrients.';
      setConversationHistory((prev) => [...prev, { role: 'agent', text: errorMsg }]);
      if (isRecording) {
        speakText(errorMsg);
      }
    }
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setTranscript("");
    setMessage("");
    const clearMsg = "Chat cleared.";
    setConversationHistory([{ role: 'agent', text: clearMsg }]);
    speakText(clearMsg);
    closeDropdown();
  };

  const stopConversation = () => {
    if (isRecording && recognition) {
      setIsRecording(false);
      recognition.stop();
    }
    setConversationHistory([]);
    setTranscript("");
    setMessage("");
    const stopMsg = "Conversation stopped.";
    setConversationHistory([{ role: 'agent', text: stopMsg }]);
    speakText(stopMsg);
    closeDropdown();
  };

  const toggleShortAnswers = () => {
    setShortAnswers(!shortAnswers);
    const msg = `Switched to ${!shortAnswers ? 'short' : 'detailed'} answers.`;
    setConversationHistory((prev) => [...prev, { role: 'agent', text: msg }]);
    speakText(msg);
    closeDropdown();
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white/90">
            AI Chat & Voice Agent
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Chat or speak to check stock or get meal suggestions!
          </p>
        </div>
        <div className="relative inline-block">
          <button className="dropdown-toggle" onClick={toggleDropdown}>
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
          </button>
          <Dropdown isOpen={isOpen} onClose={closeDropdown} className="w-40 p-2">
            <DropdownItem onItemClick={clearConversation} className="...">Clear Chat</DropdownItem>
            <DropdownItem onItemClick={stopConversation} className="...">Stop Conversation</DropdownItem>
            <DropdownItem onItemClick={toggleShortAnswers} className="...">
              {shortAnswers ? "Detailed Answers" : "Short Answers"}
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <div className="my-6">
        <button
          onClick={handleVoiceInput}
          className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 ${
            isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-500 hover:bg-brand-600'
          } text-white transition-colors`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0 5 5 0 11-10 0 1 1 0 10-2 0 7.001 7.001 0 006 6.93V17a1 1 0 102 0v-2.07z" clipRule="evenodd" />
          </svg>
          {isRecording ? 'Stop Listening' : 'Start Listening'}
        </button>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {conversationHistory.map((entry, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${
              entry.role === 'user' ? 'bg-gray-100 dark:bg-gray-800' : 'bg-brand-50 dark:bg-brand-900/10'
            }`}
          >
            <p
              className={`font-medium ${
                entry.role === 'user' ? 'text-gray-900 dark:text-white/90' : 'text-brand-800 dark:text-brand-200'
              }`}
            >
              {entry.role === 'user' ? 'You:' : 'Agent:'}
            </p>
            <p
              className={`mt-1 ${
                entry.role === 'user' ? 'text-gray-600 dark:text-gray-300' : 'text-brand-600 dark:text-brand-300'
              }`}
            >
              {entry.text}
            </p>
          </div>
        ))}
        {transcript && !conversationHistory.some((entry) => entry.text === transcript) && (
          <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
            <p className="font-medium text-gray-900 dark:text-white/90">You:</p>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{transcript}</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-500 px-4 py-2 text-white hover:bg-brand-600"
        >
          Send
        </button>
      </form>
    </div>
  );
}