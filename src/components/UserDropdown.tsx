import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Shield, ChevronDown, LogOut, KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/contexts/AdminContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserDropdownProps {
    displayName: string;
}

export default function UserDropdown({ displayName }: UserDropdownProps) {
    const navigate = useNavigate();
    const { isAdmin } = useAdmin();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 text-gray-600 hover:text-gray-900 outline-none">
                <div className="flex items-center gap-2">
                    <div className="bg-white p-1 rounded-full shadow-sm">
                        <UserIcon className="w-5 h-5 text-gray-600" />
                    </div>
                    <span className="font-medium text-sm truncate max-w-[120px] lg:max-w-[200px]">{displayName}</span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                    <UserIcon className="w-4 h-4 mr-2" />
                    <span>Profile</span>
                </DropdownMenuItem>
                {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                        <Shield className="w-4 h-4 mr-2" />
                        <span>Admin Panel</span>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate('/reset-password')} className="cursor-pointer">
                    <KeyRound className="w-4 h-4 mr-2" />
                    <span>Reset Password</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer focus:text-red-700 focus:bg-red-50">
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Sign Out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
