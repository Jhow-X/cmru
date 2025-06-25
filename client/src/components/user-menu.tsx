import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Settings, User, LogOut } from "lucide-react";

export default function UserMenu() {
  const { user, logoutMutation } = useAuth();
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // If no user, don't render the menu
  if (!user) return null;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative flex items-center space-x-2 h-8 hover:bg-transparent">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-sm bg-primary-light">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-sm font-medium">{user.name}</span>
          <ChevronDown className="h-4 w-4 text-neutral-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <Link href="/profile">
              <a className="w-full">Meu Perfil</a>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <Link href="/settings">
              <a className="w-full">Configurações</a>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={handleLogout} disabled={logoutMutation.isPending}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{logoutMutation.isPending ? "Saindo..." : "Sair"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
