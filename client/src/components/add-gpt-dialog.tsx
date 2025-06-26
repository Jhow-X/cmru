import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { Category } from "@shared/schema";
import { Loader2, Upload, X, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Complete GPT creation schema (same as admin)
const createGptSchema = z.object({
  title: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  systemInstructions: z.string().min(10, "Instruções do sistema devem ter pelo menos 10 caracteres"),
  model: z.string().min(1, "Modelo é obrigatório"),
  temperature: z.number().min(0).max(100).default(70),
  files: z.array(z.string()).default([]),
  category: z.string().min(1, "Categoria é obrigatória"),
  creatorName: z.string().optional(),
  imageUrl: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(true),
});

type CreateGptFormValues = z.infer<typeof createGptSchema>;

interface AddGptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddGptDialog({ open, onOpenChange }: AddGptDialogProps) {
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [vectorStoreId, setVectorStoreId] = useState<string>("");
  
  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch OpenAI models
  const { data: models = [] } = useQuery<string[]>({
    queryKey: ["/api/openai/models"],
  });
  
  // Form setup
  const form = useForm<CreateGptFormValues>({
    resolver: zodResolver(createGptSchema),
    defaultValues: {
      title: "",
      description: "",
      name: "",
      systemInstructions: "",
      model: "gpt-4o",
      temperature: 70,
      files: [],
      category: "",
      creatorName: "",
      imageUrl: "",
      isFeatured: false,
      isNew: true,
    },
  });
  
  // File upload mutation
  const uploadFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('gptName', form.getValues('name') || 'GPT Files');
      
      const response = await fetch('/api/upload/files', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setVectorStoreId(data.vectorStoreId);
      form.setValue('files', data.files.map((f: any) => f.name));
      toast({
        title: "Arquivos enviados com sucesso",
        description: `${data.files.length} arquivo(s) processado(s) e armazenado(s) no OpenAI.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create GPT mutation
  const createGptMutation = useMutation({
    mutationFn: async (data: CreateGptFormValues) => {
      const gptData = { ...data, vectorStoreId };
      const response = await apiRequest("POST", "/api/gpts", gptData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gpts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gpts/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gpts/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gpts/new"] });
      toast({
        title: "GPT criado",
        description: "O GPT foi criado com sucesso.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar GPT",
        description: error.message || "Não foi possível criar o GPT.",
        variant: "destructive",
      });
    },
  });
  
  // File handling functions
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    // Validate file types
    const allowedTypes = [
      'text/plain',
      'text/markdown', 
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/json'
    ];
    
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      toast({
        title: "Arquivo não suportado",
        description: "Apenas documentos (PDF, DOC, DOCX, TXT, MD, CSV, JSON) são permitidos.",
        variant: "destructive",
      });
      return;
    }
    
    setUploadedFiles(prev => [...prev, ...files]);
  }, [toast]);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = useCallback(async () => {
    if (uploadedFiles.length === 0) return;
    
    setIsUploading(true);
    uploadFilesMutation.mutate(uploadedFiles);
    setIsUploading(false);
  }, [uploadedFiles, uploadFilesMutation]);

  const onSubmit = (data: CreateGptFormValues) => {
    createGptMutation.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo GPT</DialogTitle>
          <DialogDescription>
            Crie um GPT personalizado com instruções específicas e configurações avançadas.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      className="min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome do GPT" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="systemInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instruções do Sistema</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      className="min-h-[100px]"
                      placeholder="Você é um assistente especializado que..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o modelo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperature (0-100)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        max="100" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 70)}
                        placeholder="70"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="files"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arquivos (URLs separadas por vírgula)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://exemplo.com/arquivo1.pdf, https://exemplo.com/arquivo2.txt"
                      value={field.value?.join(', ') || ''}
                      onChange={(e) => {
                        const urls = e.target.value.split(',').map(url => url.trim()).filter(url => url);
                        field.onChange(urls);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="creatorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Criador (Opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Seu nome" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Imagem (Opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://exemplo.com/imagem.jpg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload Section */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Arquivos de Referência</label>
                <p className="text-xs text-muted-foreground">
                  Faça upload de documentos (PDF, DOC, DOCX, TXT, MD, CSV, JSON) para que o GPT possa acessá-los durante as conversas.
                </p>
              </div>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <div className="mt-2">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-sm font-medium text-primary">Clique para fazer upload</span>
                      <span className="text-sm text-muted-foreground"> ou arraste arquivos aqui</span>
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.md,.csv,.json"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Máximo 10 arquivos, 50MB cada
                  </p>
                </div>
              </div>

              {/* Selected Files Display */}
              {uploadedFiles.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Arquivos Selecionados ({uploadedFiles.length})</span>
                        <Button
                          type="button"
                          onClick={uploadFiles}
                          disabled={isUploading || uploadFilesMutation.isPending}
                          size="sm"
                        >
                          {isUploading || uploadFilesMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-3 w-3" />
                              Enviar para OpenAI
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-xs bg-muted p-2 rounded">
                            <div className="flex items-center">
                              <FileText className="h-3 w-3 mr-2" />
                              <span className="truncate">{file.name}</span>
                              <span className="ml-2 text-muted-foreground">
                                ({(file.size / 1024 / 1024).toFixed(1)} MB)
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Vector Store Status */}
              {vectorStoreId && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center text-green-700">
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="text-sm">
                        Arquivos processados e armazenados no OpenAI com sucesso!
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createGptMutation.isPending}>
                {createGptMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar GPT"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}