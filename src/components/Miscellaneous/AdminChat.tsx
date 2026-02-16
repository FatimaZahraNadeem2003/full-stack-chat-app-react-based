import React, { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  CardBody,
  Avatar,
  Button,
  useToast,
  Input,
  Divider,
  IconButton,
  Tooltip,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import { CloseIcon, ChatIcon, AddIcon } from '@chakra-ui/icons';
import axios from '../../config/axiosConfig';
import io from 'socket.io-client';
import SingleChat from './SingleChat';
import AdminSingleChat from './AdminSingleChat'; 
import { Message as MessageType, User as UserType } from './../../config/ChatLogics';

interface User {
  _id: string;
  name: string;
  email: string;
  pic: string;
}

interface Chat {
  _id: string;
  chatName: string;
  isGroupChat: boolean;
  users: User[];
  latestMessage?: MessageType;
  groupAdmin?: User;
}

interface Admin {
  _id: string;
  name: string;
  email: string;
  pic?: string;
  isAdmin: boolean;
  token?: string;
}

interface AdminChatProps {
  onClose: () => void;
}

const AdminChat: React.FC<AdminChatProps> = ({ onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [adminGroups, setAdminGroups] = useState<Chat[]>([]);
  const [groupsAdminIsIn, setGroupsAdminIsIn] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]); 
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [socket, setSocket] = useState<any>(null);
  const [creatingGroup, setCreatingGroup] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>('');
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState<string[]>([]);
  const [fetchAgain, setFetchAgain] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [adminInfo, setAdminInfo] = useState<any>(null); 
  const toast = useToast();

  const fetchUsers = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${JSON.parse(localStorage.getItem('adminInfo') || '{}').token}`
        }
      };

      const { data } = await axios.get<User[]>('/api/admin/users', config);
      const validUsers = data.filter(user => user && user._id && user.name);
      setUsers(validUsers);
    } catch (error: any) {
      toast({
        title: 'Error fetching users',
        description: error.response?.data?.message || 'Failed to load users',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'bottom'
      });
    }
  };

  const fetchChats = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${JSON.parse(localStorage.getItem('adminInfo') || '{}').token}`
        }
      };

      const { data } = await axios.get<Chat[]>('/api/admin/chats', config);
      const validChats = data.filter(chat => chat && chat._id);
      setChats(validChats);
      setLoading(false);
    } catch (error: any) {
      toast({
        title: 'Error fetching chats',
        description: error.response?.data?.message || 'Failed to load chats',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'bottom'
      });
      setLoading(false);
    }
  };

  const fetchAdminGroups = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${JSON.parse(localStorage.getItem('adminInfo') || '{}').token}`
        }
      };

      const { data } = await axios.get<Chat[]>('/api/admin/groups/created', config);
      setAdminGroups(data);
    } catch (error: any) {
      console.error('Error fetching admin groups:', error);
    }
  };

  const fetchGroupsAdminIsIn = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${JSON.parse(localStorage.getItem('adminInfo') || '{}').token}`
        }
      };

      const { data } = await axios.get<Chat[]>('/api/admin/groups/member', config);
      setGroupsAdminIsIn(data);
    } catch (error: any) {
      console.error('Error fetching groups admin is in:', error);
    }
  };

  const accessAdminChat = async (userId: string) => {
    try {
      const config = {
        headers: {
          'Content-type': 'application/json',
          Authorization: `Bearer ${JSON.parse(localStorage.getItem('adminInfo') || '{}').token}`
        }
      };

      const { data } = await axios.post<Chat>('/api/admin/chat', { userId }, config);
      if (data) {
        setSelectedChat(data);
        setFetchAgain(!fetchAgain);
        fetchChats();
      }
    } catch (error: any) {
      toast({
        title: 'Error accessing chat',
        description: error.response?.data?.message || 'Failed to access chat',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'bottom'
      });
    }
  };

  const createAdminGroupChat = async () => {
    if (groupName.trim() === '' || selectedUsersForGroup.length < 2) {
      toast({
        title: 'Error',
        description: 'Please enter a group name and select at least 2 users',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'bottom'
      });
      return;
    }

    try {
      const config = {
        headers: {
          'Content-type': 'application/json',
          Authorization: `Bearer ${JSON.parse(localStorage.getItem('adminInfo') || '{}').token}`
        }
      };

      const { data } = await axios.post<Chat>('/api/admin/group', {
        name: groupName,
        users: JSON.stringify(selectedUsersForGroup)
      }, config);

      if (data) {
        toast({
          title: 'Group created',
          description: 'Group created successfully',
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'bottom'
        });
        setCreatingGroup(false);
        setGroupName('');
        setSelectedUsersForGroup([]);
        fetchAdminGroups();
        fetchGroupsAdminIsIn();
      }
    } catch (error: any) {
      toast({
        title: 'Error creating group',
        description: error.response?.data?.message || 'Failed to create group',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'bottom'
      });
    }
  };

  const handleTabChange = (index: number) => {
    setActiveTab(index);
    if (index === 1) {
      fetchAdminGroups();
    } else if (index === 2) {
      fetchGroupsAdminIsIn();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsersForGroup((prev: string[]) => {
      if (prev.includes(userId)) {
        return prev.filter((id: string) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  useEffect(() => {
    fetchUsers();
    fetchChats();
    
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api/v1', '') || 'https://full-stack-chat-app-node-based.onrender.com');
    setSocket(newSocket);
    
    const adminData = JSON.parse(localStorage.getItem('adminInfo') || '{}');
    const formattedAdminInfo = {
      ...adminData,
      isAdmin: true 
    };
    setAdminInfo(formattedAdminInfo);

    return () => {
      newSocket.close();
    };
  }, [fetchChats, fetchUsers]);

  useEffect(() => {
    if (socket) {
      socket.on('message recieved', (newMessageRecieved: MessageType) => {
        if (selectedChat && selectedChat._id === newMessageRecieved.chat._id) {
          setMessages((prev: MessageType[]) => [...prev, newMessageRecieved]);
        }
        fetchChats();
      });
    }

    return () => {
      if (socket) {
        socket.off('message recieved');
      }
    };
  }, [socket, selectedChat, fetchChats]);

  return (
    <Flex h="100vh" position="relative" p={0}>
      <Box w="300px" borderRight="1px" borderColor="gray.200" display="flex" flexDirection="column">
        <Flex justify="space-between" align="center" p={4} bg="white">
          <Heading size="md">Admin Chat</Heading>
          <Tooltip label="Close">
            <IconButton 
              aria-label="Close" 
              icon={<CloseIcon />} 
              size="sm" 
              onClick={onClose}
            />
          </Tooltip>
        </Flex>
        
        <Divider />
        
        <Tabs variant="soft-rounded" colorScheme="teal" onChange={handleTabChange} isFitted>
          <TabList mb="1em" px={2}>
            <Tab>Users</Tab>
            <Tab>My Groups</Tab>
            <Tab>Groups</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel p={0}>
              <Box p={4} flex="1" overflowY="auto">
                <Flex justify="space-between" align="center" mb={3}>
                  <Heading size="sm">Users</Heading>
                  <Button 
                    size="xs" 
                    colorScheme="teal" 
                    leftIcon={<AddIcon />} 
                    onClick={() => setCreatingGroup(true)}
                  >
                    Create Group
                  </Button>
                </Flex>
                
                {creatingGroup ? (
                  <Box mb={4}>
                    <Input
                      placeholder="Group Name"
                      value={groupName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setGroupName(e.target.value)}
                      mb={3}
                    />
                    <Text fontSize="sm" fontWeight="bold" mb={2}>Select Users:</Text>
                    {users.filter((user: User) => user._id !== JSON.parse(localStorage.getItem('adminInfo') || '{}')._id).map((user: User) => (
                      <Card 
                        key={user._id} 
                        mb={2}
                        cursor="pointer"
                        onClick={() => toggleUserSelection(user._id)}
                        bg={selectedUsersForGroup.includes(user._id) ? "teal.50" : "white"}
                        border={selectedUsersForGroup.includes(user._id) ? "2px solid teal" : "1px solid gray"}
                      >
                        <CardBody p={3}>
                          <Flex align="center">
                            <Avatar size="sm" src={user.pic} mr={3} />
                            <Box>
                              <Text fontWeight="medium">{user.name}</Text>
                              <Text fontSize="sm" color="gray.600">{user.email}</Text>
                            </Box>
                            <Badge 
                              ml="auto" 
                              colorScheme={selectedUsersForGroup.includes(user._id) ? "teal" : "gray"}
                            >
                              {selectedUsersForGroup.includes(user._id) ? "Selected" : "Select"}
                            </Badge>
                          </Flex>
                        </CardBody>
                      </Card>
                    ))}
                    <Flex mt={3} gap={2}>
                      <Button 
                        size="sm" 
                        colorScheme="teal" 
                        onClick={createAdminGroupChat}
                        isDisabled={selectedUsersForGroup.length < 2}
                      >
                        Create Group
                      </Button>
                      <Button 
                        size="sm" 
                        colorScheme="gray" 
                        onClick={() => {
                          setCreatingGroup(false);
                          setGroupName('');
                          setSelectedUsersForGroup([]);
                        }}
                      >
                        Cancel
                      </Button>
                    </Flex>
                  </Box>
                ) : (
                  users && users.length > 0 ? (
                    users.map((user: User) => {
                      if (!user || !user._id) return null;
                      
                      return (
                        <Card 
                          key={user._id} 
                          mb={2}
                          cursor="pointer"
                          onClick={() => accessAdminChat(user._id)}
                          _hover={{ bg: "gray.50" }}
                        >
                          <CardBody p={3}>
                            <Flex align="center">
                              <Avatar size="sm" src={user.pic} mr={3} />
                              <Box>
                                <Text fontWeight="medium">{user.name}</Text>
                                <Text fontSize="sm" color="gray.600">{user.email}</Text>
                              </Box>
                            </Flex>
                          </CardBody>
                        </Card>
                      );
                    }).filter(Boolean)
                  ) : (
                    <Text color="gray.500" textAlign="center" mt={4}>
                      No users available
                    </Text>
                  )
                )}
              </Box>
            </TabPanel>
            
            <TabPanel p={0}>
              <Box p={4} flex="1" overflowY="auto">
                <Heading size="sm" mb={3}>Groups Created by Admin</Heading>
                {adminGroups && adminGroups.length > 0 ? (
                  adminGroups.map((chat: Chat) => {
                    if (!chat || !chat._id) return null;
                    
                    return (
                      <Card 
                        key={chat._id} 
                        mb={2}
                        cursor="pointer"
                        onClick={() => {
                          setSelectedChat(chat);
                          setFetchAgain(!fetchAgain);
                        }}
                        bg={selectedChat?._id === chat._id ? "teal.50" : "white"}
                        border={selectedChat?._id === chat._id ? "2px solid" : "1px solid"}
                        borderColor={selectedChat?._id === chat._id ? "teal.400" : "gray.200"}
                      >
                        <CardBody p={3}>
                          <Text fontWeight="bold" mb={1} fontSize="sm">
                            {chat.chatName}
                          </Text>
                          <Text fontSize="xs" color="gray.500">{chat.users.length} members</Text>
                          {chat.latestMessage ? (
                            <Box>
                              <Text fontSize="xs" color="gray.600" noOfLines={1}>
                                {chat.latestMessage.content}
                              </Text>
                              <Text fontSize="xs" color="gray.400" mt={1}>
                                {formatDate(chat.latestMessage.createdAt!)}
                              </Text>
                            </Box>
                          ) : (
                            <Text fontSize="xs" color="gray.500">No messages</Text>
                          )}
                        </CardBody>
                      </Card>
                    );
                  }).filter(Boolean)
                ) : (
                  <Text color="gray.500" textAlign="center" mt={4}>
                    No groups created by admin
                  </Text>
                )}
              </Box>
            </TabPanel>
            
            <TabPanel p={0}>
              <Box p={4} flex="1" overflowY="auto">
                <Heading size="sm" mb={3}>Groups with Admin</Heading>
                {groupsAdminIsIn && groupsAdminIsIn.length > 0 ? (
                  groupsAdminIsIn.map((chat: Chat) => {
                    if (!chat || !chat._id) return null;
                    
                    return (
                      <Card 
                        key={chat._id} 
                        mb={2}
                        cursor="pointer"
                        onClick={() => {
                          setSelectedChat(chat);
                          setFetchAgain(!fetchAgain);
                        }}
                        bg={selectedChat?._id === chat._id ? "teal.50" : "white"}
                        border={selectedChat?._id === chat._id ? "2px solid" : "1px solid"}
                        borderColor={selectedChat?._id === chat._id ? "teal.400" : "gray.200"}
                      >
                        <CardBody p={3}>
                          <Text fontWeight="bold" mb={1} fontSize="sm">
                            {chat.chatName}
                          </Text>
                          <Text fontSize="xs" color="gray.500">{chat.users.length} members</Text>
                          {chat.latestMessage ? (
                            <Box>
                              <Text fontSize="xs" color="gray.600" noOfLines={1}>
                                {chat.latestMessage.content}
                              </Text>
                              <Text fontSize="xs" color="gray.400" mt={1}>
                                {formatDate(chat.latestMessage.createdAt!)}
                              </Text>
                            </Box>
                          ) : (
                            <Text fontSize="xs" color="gray.500">No messages</Text>
                          )}
                        </CardBody>
                      </Card>
                    );
                  }).filter(Boolean)
                ) : (
                  <Text color="gray.500" textAlign="center" mt={4}>
                    No groups with admin
                  </Text>
                )}
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <Box flex={1} display="flex" flexDirection="column">
        {selectedChat ? (
          <Box
            display="flex"
            flexDir="column"
            flex={1}
            w="100%"
            h="100%"
            bg="rgba(255, 255, 255, 0.1)"
            backdropFilter="blur(12px)"
            borderRadius="2xl"
            borderWidth="1px"
            borderColor="gray.200"
            boxShadow="lg"
            overflow="hidden"
            m={4}
          >
            <AdminSingleChat 
              fetchAgain={fetchAgain} 
              setFetchAgain={setFetchAgain}
              selectedChat={selectedChat}
              setSelectedChat={setSelectedChat}
              adminInfo={adminInfo} 
              socket={socket}
              messages={messages}
              setMessages={setMessages}
            />
          </Box>
        ) : (
          <Flex align="center" justify="center" h="100%">
            <Box textAlign="center">
              <ChatIcon boxSize={12} color="gray.300" mb={4} />
              <Text color="gray.500" fontSize="lg">
                Select a user or group to start messaging
              </Text>
              <Text color="gray.400" fontSize="sm">
                Admin can chat with users and groups
              </Text>
            </Box>
          </Flex>
        )}
      </Box>
    </Flex>
  );
};

export default AdminChat;