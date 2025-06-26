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
import Header from "@/components/layout/header";
import type { Gpt, ChatMessage as DBChatMessage } from "@shared/schema";

interface ChatResponse {
  message: string;
  gptId: number;
}

export default function ChatPage() {
  const [inputMessage, setInputMessage] = useState("");
  const [selectedGptId, setSelectedGptId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Initialize selectedGptId from URL search params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gptIdParam = urlParams.get('gptId');
    if (gptIdParam) {
      const gptId = parseInt(gptIdParam);
      if (!isNaN(gptId)) {
        setSelectedGptId(gptId);
      }
    }
  }, []);

  // Fetch all GPTs for agent selection
  const {
    data: gpts = [],
    isLoading: gptsLoading,
  } = useQuery<Gpt[]>({
    queryKey: ["/api/gpts"],
  });

  // Fetch messages for the selected GPT
  const {
    data: currentMessages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery<DBChatMessage[]>({
    queryKey: [`/api/chat/${selectedGptId}/messages`],
    enabled: !!selectedGptId,
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
    onSuccess: () => {
      // Refetch messages to get the updated conversation from database
      refetchMessages();
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

  // Clear messages mutation
  const clearMessagesMutation = useMutation({
    mutationFn: async (gptId: number) => {
      const response = await fetch(`/api/chat/${gptId}/messages`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Erro ao limpar mensagens");
      }
    },
    onSuccess: () => {
      refetchMessages();
      toast({
        title: "Conversa limpa",
        description: "Todas as mensagens foram removidas",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao limpar conversa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

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
    if (selectedGptId) {
      clearMessagesMutation.mutate(selectedGptId);
    }
  };

  const selectedGpt = gpts.find(gpt => gpt.id === selectedGptId);

  // Set document title
  useEffect(() => {
    document.title = "GPT da Câmara Regional de Caruaru do TJPE - Chat";
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-primary-bg">
      <Header />
      
      <div className="container mx-auto p-6 max-w-6xl flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
          {/* Agent Selection Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Agentes Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2">
                  {gptsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    gpts.map((gpt) => (
                      <Button
                        key={gpt.id}
                        variant={selectedGptId === gpt.id ? "default" : "ghost"}
                        className="w-full justify-start text-left h-auto p-3"
                        onClick={() => setSelectedGptId(gpt.id)}
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{gpt.title}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-full">
                            {gpt.description}
                          </span>
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {gpt.category || "Geral"}
                          </Badge>
                        </div>
                      </Button>
                    ))
                  )}
              </div>
            </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-3 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {selectedGpt ? selectedGpt.title : "Selecione um agente"}
                    </CardTitle>
                    {selectedGpt && (
                      <p className="text-sm text-muted-foreground">
                        {selectedGpt.description}
                      </p>
                    )}
                  </div>
                </div>
                {selectedGpt && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearChat}
                      disabled={clearMessagesMutation.isPending}
                    >
                      {clearMessagesMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Limpar
                    </Button>
                  </div>
                )}
            </div>
          </CardHeader>
          
          <Separator />
          
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {currentMessages.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {selectedGpt
                      ? `Comece uma conversa com ${selectedGpt.title}`
                      : "Selecione um agente para começar a conversar"}
                  </p>
                </div>
              ) : (
                currentMessages.map((message: DBChatMessage) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex gap-3 max-w-[80%] ${
                        message.role === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback>
                          {message.role === "user" ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="flex gap-3 max-w-[80%]">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg px-4 py-2 bg-muted">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <Separator />
          
          {/* Input Area */}
          <div className="p-4">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  selectedGpt
                    ? `Envie uma mensagem para ${selectedGpt.title}...`
                    : "Selecione um agente primeiro..."
                }
                disabled={!selectedGpt}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || !selectedGpt || chatMutation.isPending}
                size="sm"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
        </div>
      </div>
    </div>
  );
}