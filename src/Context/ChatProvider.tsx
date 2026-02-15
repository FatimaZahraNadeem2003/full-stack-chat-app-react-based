import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import axios from '../config/axiosConfig';

export interface User {
  _id: string;
  name: string;
  email: string;
  pic: string;
  token?: string; 
}

export interface Chat {
  _id: string;
  isGroupChat: boolean;
  users: User[];
  chatName: string;
  latestMessage?: Message;
  groupAdmin?: User;
}

export interface Message {
  _id: string;
  sender: User;
  content: string;
  chat: Chat;
  replyTo?: Message;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  isUploading?: boolean;
  readBy?: string[]; 
  createdAt?: string;
}

interface ChatContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  selectedChat: Chat | string | null;
  setSelectedChat: React.Dispatch<React.SetStateAction<Chat | string | null>>;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  notification: any[];
  setNotification: React.Dispatch<React.SetStateAction<any[]>>;
  unreadCounts: Record<string, number>;
  setUnreadCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  fetchUnreadCounts: () => Promise<void>;
  markChatAsRead: (chatId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [notification, setNotification] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const fetchUnreadCounts = async () => {
    if (!user?.token) return;
    
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get('/api/message/unread/counts', config);
      
      const countsMap: Record<string, number> = {};
      data.forEach((item: { chatId: string; unreadCount: number }) => {
        countsMap[item.chatId] = item.unreadCount;
      });
      
      setUnreadCounts(countsMap);
    } catch (error) {
      console.error('Failed to fetch unread counts:', error);
    }
  };

  const markChatAsRead = async (chatId: string) => {
    if (!user?.token) return;
    
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`/api/message/${chatId}/read`, {}, config);
      
      setUnreadCounts(prev => ({
        ...prev,
        [chatId]: 0
      }));
      
      setNotification(prev => prev.filter(n => n.chat?._id !== chatId));
    } catch (error) {
      console.error('Failed to mark chat as read:', error);
    }
  };

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || 'null');
    setUser(userInfo);
    console.log(userInfo);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || 'null');
      setUser(userInfo);
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchUnreadCounts();
    }
  }, [user]);

  return (
    <ChatContext.Provider 
      value={{ 
        user, setUser, 
        selectedChat, setSelectedChat, 
        chats, setChats, 
        notification, setNotification,
        unreadCounts, setUnreadCounts,
        fetchUnreadCounts,
        markChatAsRead
      }}
    >
      {children}
    </ChatContext.Provider> 
  );
};

export const ChatState = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('ChatState must be used within a ChatProvider');
  }
  return context;
}

export default ChatProvider;