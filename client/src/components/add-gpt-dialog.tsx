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
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { Category } from "@shared/schema";
import { Loader2, Upload, X } from "lucide-react";

// Complete GPT creation schema (same as admin)
const createGptSchema = z.object({
  title: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  systemInstructions: z.string().min(10, "Instruções do sistema devem ter pelo menos 10 caracteres"),
  model: z.string().min(1, "Modelo é obrigatório"),
  temperature: z.number().min(0).max(100).default(70),
  files: z.array(z.string()).default([]),
  vectorStoreId: z.string().optional(),
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
  const [uploading, setUploading] = useState(false);
  
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
      vectorStoreId: "",
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
      
      const response = await fetch('/api/upload/files', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Falha no upload dos arquivos');
      }
      
      return response.json();
    },
  });

  // Create GPT mutation
  const createGptMutation = useMutation({
    mutationFn: async (data: CreateGptFormValues) => {
      // First upload files if any
      let vectorStoreId = data.vectorStoreId;
      
      if (uploadedFiles.length > 0) {
        setUploading(true);
        try {
          const uploadResult = await uploadFilesMutation.mutateAsync(uploadedFiles);
          vectorStoreId = uploadResult.vectorStoreId;
          
          // Update file names for display
          const fileNames = uploadResult.files.map((f: any) => f.name);
          data.files = fileNames;
        } catch (error) {
          setUploading(false);
          throw new Error('Falha no upload dos arquivos');
        }
        setUploading(false);
      }
      
      const response = await apiRequest("POST", "/api/gpts", { ...data, vectorStoreId });
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
      setUploading(false);
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
            
            {/* File Upload Section */}
            <div className="space-y-4">
              <FormLabel>Arquivos para Busca (Opcional)</FormLabel>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Clique para selecionar arquivos ou arraste aqui
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        multiple
                        accept=".pdf,.txt,.docx,.doc,.md,.json,.csv"
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.files) {
                            const files = Array.from(e.target.files);
                            setUploadedFiles(prev => [...prev, ...files]);
                          }
                        }}
                      />
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      PDF, TXT, DOCX, DOC, MD, JSON, CSV até 10 arquivos
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Display uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Arquivos selecionados:</p>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadedFiles(files => files.filter((_, i) => i !== index));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        GPT em Destaque
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isNew"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        GPT Novo
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createGptMutation.isPending || uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando arquivos...
                  </>
                ) : createGptMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando GPT...
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