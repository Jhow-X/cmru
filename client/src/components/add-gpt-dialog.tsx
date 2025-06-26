import { useState } from "react";
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
import { Loader2 } from "lucide-react";

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
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
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
  
  // File upload function
  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('documents', files[i]);
    }
    
    try {
      const response = await fetch('/api/upload/documents', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Falha no upload dos documentos');
      }
      
      const result = await response.json();
      const filePaths = result.files.map((file: any) => file.path);
      setUploadedFiles(prev => [...prev, ...filePaths]);
      
      toast({
        title: "Upload realizado",
        description: `${result.files.length} documento(s) enviado(s) com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar os documentos.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Create GPT mutation
  const createGptMutation = useMutation({
    mutationFn: async (data: CreateGptFormValues) => {
      // Include uploaded files in the data
      const gptData = {
        ...data,
        files: uploadedFiles,
      };
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
      setUploadedFiles([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar GPT",
        description: error.message || "Não foi possível criar o GPT.",
        variant: "destructive",
      });
    },
  });
  
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
            
            <div className="space-y-4">
              <FormLabel>Documentos de Referência</FormLabel>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.csv,.json"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <div className="text-gray-600">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                        <p>Enviando documentos...</p>
                      </>
                    ) : (
                      <>
                        <svg className="h-8 w-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p>Clique para enviar documentos ou arraste aqui</p>
                        <p className="text-sm text-gray-500">
                          PDF, DOC, DOCX, TXT, CSV, JSON (máx. 10MB cada)
                        </p>
                      </>
                    )}
                  </div>
                </label>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <FormLabel>Documentos enviados:</FormLabel>
                  <div className="bg-gray-50 p-3 rounded-md">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between py-1">
                        <span className="text-sm text-gray-700">{file.split('/').pop()}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

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