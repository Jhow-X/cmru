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
import { Loader2, Upload, X, FileText } from "lucide-react";

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
      files.forEach((file, index) => {
        formData.append(`files`, file);
      });
      
      const response = await fetch("/api/upload/files", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Erro ao fazer upload dos arquivos");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Update form with uploaded file paths
      form.setValue("files", data.filePaths || []);
      toast({
        title: "Arquivos enviados",
        description: `${uploadedFiles.length} arquivo(s) enviado(s) com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível enviar os arquivos.",
        variant: "destructive",
      });
    },
  });

  // Create GPT mutation
  const createGptMutation = useMutation({
    mutationFn: async (data: CreateGptFormValues) => {
      const response = await apiRequest("POST", "/api/gpts", data);
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
  
  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    // Also remove from form if it was already uploaded
    const currentFiles = form.getValues("files");
    if (currentFiles && currentFiles.length > index) {
      form.setValue("files", currentFiles.filter((_, i) => i !== index));
    }
  };

  const uploadFiles = async () => {
    if (uploadedFiles.length === 0) return;
    
    setIsUploading(true);
    try {
      await uploadFilesMutation.mutateAsync(uploadedFiles);
    } catch (error) {
      // Error handling is done in the mutation
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: CreateGptFormValues) => {
    // Upload files first if there are any
    if (uploadedFiles.length > 0 && !data.files?.length) {
      await uploadFiles();
      // Wait for the files to be uploaded and form to be updated
      const updatedData = { ...data, files: form.getValues("files") };
      createGptMutation.mutate(updatedData);
    } else {
      createGptMutation.mutate(data);
    }
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
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Arquivos de Referência
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Faça upload de documentos PDF, TXT ou DOCX para criar um banco de conhecimento para o GPT
                </p>
              </div>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-foreground">
                        Clique para selecionar arquivos
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        PDF, TXT, DOCX até 10MB cada
                      </span>
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.txt,.docx,.doc"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* File List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Arquivos Selecionados:</h4>
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {uploadedFiles.length > 0 && !form.getValues("files")?.length && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={uploadFiles}
                      disabled={isUploading}
                      className="w-full"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando arquivos...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Enviar Arquivos ({uploadedFiles.length})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Show uploaded files status */}
              {form.getValues("files")?.length > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ {form.getValues("files").length} arquivo(s) enviado(s) com sucesso
                  </p>
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