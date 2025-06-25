import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, Bot, User, RefreshCw, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Gpt } from "@shared/schema";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  gptId?: number;
}

interface ChatResponse {
  message: string;
  gptId: number;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedGptId, setSelectedGptId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();

  // Extract GPT ID from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const gptParam = params.get('gpt');
    if (gptParam) {
      const gptId = parseInt(gptParam);
      if (!isNaN(gptId)) {
        setSelectedGptId(gptId);
      }
    }
  }, [location]);

  // Fetch all GPTs for agent selection
  const {
    data: gpts = [],
    isLoading: gptsLoading,
  } = useQuery<Gpt[]>({
    queryKey: ["/api/gpts"],
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (data: { message: string; gptId: number }): Promise<ChatResponse> => {
      const response = await fetch(`/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Erro na conversa");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString() + "-assistant",
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        gptId: data.gptId,
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    },
    onError: (error: Error) => {
      console.error("Chat error:", error);
      toast({
        title: "Erro no chat",
        description: error.message,
        variant: "destructive",
      });
      setIsTyping(false);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !selectedGptId) {
      if (!selectedGptId) {
        toast({
          title: "Selecione um agente",
          description: "Escolha um GPT para conversar",
          variant: "destructive",
        });
      }
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString() + "-user",
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    chatMutation.mutate({
      message: inputMessage.trim(),
      gptId: selectedGptId,
    });

    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const selectedGpt = gpts.find(gpt => gpt.id === selectedGptId);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header with Home Button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Chat com GPTs</h1>
        <Button
          onClick={() => window.location.href = '/'}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Início
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
        {/* Agent Selection Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Agentes Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-3">
                {gptsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  gpts.map((gpt) => (
                    <div
                      key={gpt.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedGptId === gpt.id
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedGptId(gpt.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {gpt.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {gpt.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {gpt.description}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {gpt.model}
                            </Badge>
                            {gpt.category && (
                              <Badge variant="outline" className="text-xs">
                                {gpt.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="h-6 w-6" />
                <div>
                  <CardTitle className="text-lg">
                    {selectedGpt ? selectedGpt.title : "Selecione um Agente"}
                  </CardTitle>
                  {selectedGpt && (
                    <p className="text-sm text-muted-foreground">
                      {selectedGpt.model} • Temperatura: {selectedGpt.temperature || 70}%
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearChat}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Limpar
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <Separator />
          
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {selectedGpt
                      ? `Comece uma conversa com ${selectedGpt.title}`
                      : "Selecione um agente para começar a conversar"}
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    
                    {message.role === "user" && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))
              )}
              
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Digitando...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <Separator />
          
          {/* Message Input */}
          <div className="p-4">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  selectedGpt
                    ? `Escreva uma mensagem para ${selectedGpt.title}...`
                    : "Selecione um agente primeiro..."
                }
                disabled={!selectedGpt || chatMutation.isPending}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!selectedGpt || !inputMessage.trim() || chatMutation.isPending}
                size="icon"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {selectedGpt && (
              <p className="text-xs text-muted-foreground mt-2">
                Conversando com {selectedGpt.title} • {selectedGpt.category}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}