import { useState, useEffect } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";

// Define interfaces
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

// Define SpeechRecognition interface
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

interface StockItem {
  name: string;
  category: string;
  quantity: number;
  status: string;
}

interface StockAnalysis {
  totalItems: number;
  inStockItems: number;
  outOfStockItems: number;
  stockData: StockItem[];
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Get SpeechRecognition constructor
const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function AIVoiceAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [agentResponse, setAgentResponse] = useState(
    "Hello! I'm your Stock AI Assistant. Ask me about your ingredients or meal ideas!"
  );
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [shortAnswers, setShortAnswers] = useState(false);

  useEffect(() => {
    if (SpeechRecognitionConstructor) {
      const recognitionInstance: SpeechRecognition = new SpeechRecognitionConstructor();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        const text = event.results[event.results.length - 1][0].transcript;
        setTranscript(text);
        handleAgentInteraction(text);
      };

      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        const errorMsg = "Sorry, I encountered an error. Please try again!";
        setAgentResponse(errorMsg);
        speakText(errorMsg);
        setIsRecording(false);
      };

      recognitionInstance.onend = () => {
        if (isRecording) recognitionInstance.start();
      };

      setRecognition(recognitionInstance);
    } else {
      setAgentResponse("Speech recognition is not supported in your browser.");
    }
  }, [isRecording]);

  const speakText = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleVoiceInput = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
    if (isRecording) {
      setIsRecording(false);
      recognition.stop();
      speakText("I've stopped listening.");
    } else {
      setTranscript('');
      setIsRecording(true);
      recognition.start();
      speakText("I'm listening! Tell me about your stock or ask for meal ideas.");
    }
  };

  const stopConversation = () => {
    if (isRecording && recognition) {
      setIsRecording(false);
      recognition.stop();
    }
    setConversationHistory([]);
    setTranscript("");
    const stopMsg = "Conversation stopped. How can I assist you with your stock now?";
    setAgentResponse(stopMsg);
    speakText(stopMsg);
    closeDropdown();
  };

  const toggleShortAnswers = () => {
    setShortAnswers(!shortAnswers);
    const msg = `Switched to ${!shortAnswers ? "short" : "detailed"} answers.`;
    setAgentResponse(msg);
    speakText(msg);
    closeDropdown();
  };

  const handleAgentInteraction = async (userInput: string) => {
    const newHistory: ConversationEntry[] = [...conversationHistory, { role: "user", text: userInput }];
    setConversationHistory(newHistory);

    // Check if the query is about memory or stock
    const memoryKeywords = ["memory", "remember", "what do you know", "what can you tell me"];
    const stockKeywords = ["stock", "inventory", "items", "available", "quantity", "what do i have"];
    
    const isMemoryQuery = memoryKeywords.some(keyword => userInput.toLowerCase().includes(keyword));
    const isStockQuery = stockKeywords.some(keyword => userInput.toLowerCase().includes(keyword));

    if (isMemoryQuery || isStockQuery) {
      try {
        const response = await fetch('http://localhost:5000/api/stockitems/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: userInput }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get stock analysis');

        const stockAnalysis = data as StockAnalysis;
        
        // Format the response based on the analysis
        let formattedResponse = "";
        if (stockAnalysis.stockData.length === 0) {
          formattedResponse = "I don't have any items in my memory at the moment.";
        } else {
          formattedResponse = `Here's what I remember about your stock:\n\n`;
          formattedResponse += `Total Items: ${stockAnalysis.totalItems}\n`;
          formattedResponse += `Items In Stock: ${stockAnalysis.inStockItems}\n`;
          formattedResponse += `Items Out of Stock: ${stockAnalysis.outOfStockItems}\n\n`;
          
          // Group items by category
          const itemsByCategory = stockAnalysis.stockData.reduce((acc: Record<string, StockItem[]>, item: StockItem) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
          }, {});

          // Add category-wise details
          Object.entries(itemsByCategory).forEach(([category, items]) => {
            formattedResponse += `${category}:\n`;
            (items as StockItem[]).forEach((item: StockItem) => {
              formattedResponse += `- ${item.name}: ${item.quantity} units (${item.status})\n`;
            });
            formattedResponse += '\n';
          });

          // Add meal suggestions based on available items
          const availableItems = stockAnalysis.stockData.filter(item => item.status === "InStock");
          if (availableItems.length > 0) {
            formattedResponse += `\nBased on your available items, I can suggest:\n`;
            formattedResponse += `- Breakfast: ${availableItems.filter(item => item.category.toLowerCase().includes('breakfast')).length} items available\n`;
            formattedResponse += `- Lunch: ${availableItems.filter(item => item.category.toLowerCase().includes('lunch')).length} items available\n`;
            formattedResponse += `- Dinner: ${availableItems.filter(item => item.category.toLowerCase().includes('dinner')).length} items available\n`;
          }
        }

        setConversationHistory([...newHistory, { role: "agent", text: formattedResponse }]);
        setAgentResponse(formattedResponse);
        speakText(formattedResponse);
      } catch (error) {
        console.error('Error fetching stock analysis:', error);
        const errorMsg = "I couldn't access my memory right now. Please try again!";
        setAgentResponse(errorMsg);
        speakText(errorMsg);
      }
      return;
    }

    // Handle meal-related queries (existing code)
    const mealKeywords = ["meal", "cook", "breakfast", "lunch", "dinner", "food"];
    if (mealKeywords.some(keyword => userInput.toLowerCase().includes(keyword))) {
      try {
        const response = await fetch('http://localhost:5000/api/voice-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: "What can I cook today?", shortAnswers }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get response');

        const generatedText: string = data.response;

        setConversationHistory([...newHistory, { role: "agent", text: generatedText }]);
        setAgentResponse(generatedText);
        speakText(generatedText);
      } catch (error) {
        console.error('Error fetching meal suggestions:', error);
        const errorMsg = "I couldn't fetch meal ideas right now. Try again!";
        setAgentResponse(errorMsg);
        speakText(errorMsg);
      }
      return;
    }

    // Handle other queries
    try {
      const response = await fetch('http://localhost:5000/api/voice-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userInput, shortAnswers }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get response');

      const generatedText: string = data.response;

      setConversationHistory([...newHistory, { role: "agent", text: generatedText }]);
      setAgentResponse(generatedText);
      speakText(generatedText);
    } catch (error) {
      console.error('Error fetching response:', error);
      const errorMsg = "Something went wrong while processing your request!";
      setAgentResponse(errorMsg);
      speakText(errorMsg);
    }
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setTranscript("");
    const clearMsg = "Conversation cleared! Ready to talk about your stock.";
    setAgentResponse(clearMsg);
    speakText(clearMsg);
    closeDropdown();
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Stock AI Voice Agent
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Ask about your ingredients or get meal ideas based on your stock!
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
          <div key={index} className={`p-4 rounded-lg ${entry.role === 'user' ? 'bg-gray-100 dark:bg-gray-800' : 'bg-brand-50 dark:bg-brand-900/10'}`}>
            <p className={`font-semibold ${entry.role === 'user' ? 'text-gray-800 dark:text-white/90' : 'text-brand-800 dark:text-brand-200'}`}>
              {entry.role === 'user' ? 'You:' : 'Agent:'}
            </p>
            <p className={`mt-1 ${entry.role === 'user' ? 'text-gray-600 dark:text-gray-300' : 'text-brand-600 dark:text-brand-300'}`}>
              {entry.text}
            </p>
          </div>
        ))}
        {transcript && !conversationHistory.some(entry => entry.text === transcript) && (
          <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
            <p className="font-semibold text-gray-800 dark:text-white/90">You:</p>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{transcript}</p>
          </div>
        )}
        {agentResponse && !conversationHistory.some(entry => entry.text === agentResponse) && (
          <div className="p-4 rounded-lg bg-brand-50 dark:bg-brand-900/10">
            <p className="font-semibold text-brand-800 dark:text-brand-200">Agent:</p>
            <p className="text-brand-600 dark:text-brand-300 mt-1">{agentResponse}</p>
          </div>
        )}
      </div>
    </div>
  );
}