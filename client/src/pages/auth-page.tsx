import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";

// Login Form Schema
const loginSchema = z.object({
  username: z.string().min(1, "Usuário ou Email é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Registration Form Schema
const registerSchema = z.object({
  name: z.string().min(2, "Nome completo deve ter pelo menos 2 caracteres"),
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["user", "magistrate", "admin"]).default("user"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");
  
  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      role: "user",
    },
  });

  // Handle login submission
  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  // Handle registration submission
  const onRegisterSubmit = (values: RegisterFormValues) => {
    registerMutation.mutate(values);
  };

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-primary-bg">
      {/* Left side - Auth form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-md bg-secondary-bg border-0 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex justify-center mb-6">
              <h1 className="text-2xl font-bold text-center">GPT da Câmara Regional de Caruaru do TJPE</h1>
            </div>
            
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-6 w-full bg-primary-bg">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Cadastro</TabsTrigger>
              </TabsList>
              
              {/* Login Tab */}
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usuário ou Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Digite seu usuário ou email" 
                              className="w-full bg-background border border-primary-light text-foreground"
                              autoComplete="username"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Digite sua senha" 
                              className="w-full bg-background border border-primary-light text-foreground"
                              autoComplete="current-password"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-accent hover:bg-accent-hover"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : "Entrar"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              {/* Register Tab */}
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Digite seu nome completo" 
                              className="bg-primary-bg border-primary-light"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de Usuário</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Digite um nome de usuário" 
                              className="bg-primary-bg border-primary-light"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Digite seu e-mail" 
                              className="bg-primary-bg border-primary-light"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Digite uma senha" 
                              className="bg-primary-bg border-primary-light"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* O tipo de usuário é sempre "user" no cadastro público */}
                    <input type="hidden" {...registerForm.register("role")} value="user" />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-accent hover:bg-accent-hover"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cadastrando...
                        </>
                      ) : "Cadastrar"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Right side - Hero Section */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-r from-primary-bg to-secondary-bg relative">
        <div className="absolute inset-0 opacity-20">
          {/* Background image with overlay */}
          <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1589994965851-a8f479c573a9?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center p-12 w-full">
          <h2 className="text-4xl font-bold mb-6">GPTs Especializados da Câmara Regional de Caruaru</h2>
          <p className="text-xl mb-8 text-gray-200">
            Bem-vindo à plataforma da Câmara Regional de Caruaru do TJPE que reúne GPTs especializados para auxiliar 
            magistrados em processos judiciais, tornando a análise jurídica mais eficiente e precisa.
          </p>
          
          <div className="flex flex-col space-y-4 mt-4">
            <div className="flex items-center">
              <div className="bg-primary-light p-3 rounded-full mr-4">
                <i className="ri-scales-3-line text-xl text-accent"></i>
              </div>
              <div>
                <h3 className="font-semibold">Análise Jurídica Avançada</h3>
                <p className="text-gray-300 text-sm">Ferramentas de análise documental e jurisprudencial</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="bg-primary-light p-3 rounded-full mr-4">
                <i className="ri-robot-line text-xl text-accent"></i>
              </div>
              <div>
                <h3 className="font-semibold">GPTs Especializados</h3>
                <p className="text-gray-300 text-sm">Modelos treinados para diversas áreas do direito</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="bg-primary-light p-3 rounded-full mr-4">
                <i className="ri-shield-check-line text-xl text-accent"></i>
              </div>
              <div>
                <h3 className="font-semibold">Segurança e Privacidade</h3>
                <p className="text-gray-300 text-sm">Proteção total dos dados sensíveis</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
