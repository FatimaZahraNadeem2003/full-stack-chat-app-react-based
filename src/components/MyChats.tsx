import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Stack,
  Text,
  useToast,
  Flex,
  Avatar,
  Divider,
  IconButton,
  Collapse,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Portal,
  Badge,
  useColorModeValue
} from '@chakra-ui/react'
import {
  AddIcon,
  HamburgerIcon,
  DeleteIcon,
  SmallCloseIcon
} from '@chakra-ui/icons'
import axios from '../config/axiosConfig'
import { ChatState, User, Chat } from '../Context/ChatProvider'
import ChatLoading from './ChatLoading'
import { getSender } from '../config/ChatLogics'
import GroupChatModal from './Miscellaneous/GroupChatModal'
import { io } from 'socket.io-client'

interface ExtendedChat extends Chat {
  isBlocked?: boolean
  blockedBy?: (string | { _id: string })[]
}

interface MyChatsProps {
  fetchAgain: boolean
}

const MyChats: React.FC<MyChatsProps> = ({ fetchAgain }) => {
  const [showChats, setShowChats] = useState(true)
  const [socket, setSocket] = useState<any>(null)

  const { 
    user, 
    selectedChat, 
    setSelectedChat, 
    chats, 
    setChats,
    unreadCounts,        
    fetchUnreadCounts,   
    markChatAsRead,
    updateChatUnreadCount
  } = ChatState()

  const toast = useToast()
  const bgHover = useColorModeValue('gray.100', 'gray.700')

  // Socket connection for real-time updates
  useEffect(() => {
    if (!user) return
    
    const ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api/v1', '') || 'https://full-stack-chat-app-node-based.onrender.com';
    const newSocket = io(ENDPOINT)
    setSocket(newSocket)

    newSocket.emit('setup', user)

    newSocket.on('message recieved', (newMessage: any) => {
      // Update unread count for the chat
      if (selectedChat && typeof selectedChat !== 'string' && selectedChat._id === newMessage.chat._id) {
        // If current chat is open, mark as read
        markChatAsRead(newMessage.chat._id)
      } else {
        // Otherwise increment unread count
        updateChatUnreadCount(newMessage.chat._id, (unreadCounts[newMessage.chat._id] || 0) + 1)
      }
    })

    return () => {
      newSocket.disconnect()
    }
  }, [user])

  const fetchChats = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${user?.token}` }
      }
      const { data } = await axios.get<ExtendedChat[]>('/api/chat', config)
      
      const chatsWithBlockStatus = data.map(chat => ({
        ...chat,
        isBlocked: chat.blockedBy && chat.blockedBy.some(blockedUserId => {
          if (typeof blockedUserId === 'string') {
            return blockedUserId === user?._id;
          } else {
            return (blockedUserId as any)?._id === user?._id;
          }
        })
      }))
      
      setChats(chatsWithBlockStatus as any)
      
      // Fetch unread counts separately
      fetchUnreadCounts()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load chats',
        status: 'error',
        duration: 4000,
        isClosable: true
      })
    }
  }

  useEffect(() => {
    if (user) {
      fetchChats()
    }
  }, [fetchAgain, user])

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat as any)
    markChatAsRead(chat._id) 
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${user?.token}` }
      }

      await axios.delete(`/api/chat/${chatId}`, config)

      setChats(chats.filter((c: Chat) => c._id !== chatId) as any)

      if (
        typeof selectedChat !== 'string' &&
        selectedChat?._id === chatId
      ) {
        setSelectedChat('')
      }

      toast({
        title: 'Chat deleted',
        status: 'success',
        duration: 3000,
        isClosable: true
      })
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.response?.data?.message || error.message,
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    }
  }

  const handleBlockChat = async (chatId: string) => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${user?.token}` }
      }

      await axios.post(`/api/chat/${chatId}/block`, {}, config)

      setChats(chats.map((c: Chat) => 
        c._id === chatId ? { ...c, isBlocked: true } : c
      ) as any)

      toast({
        title: 'Chat blocked',
        status: 'success',
        duration: 3000,
        isClosable: true
      })
    } catch (error: any) {
      toast({
        title: 'Block failed',
        description: error.response?.data?.message || error.message,
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    }
  }

  const handleUnblockChat = async (chatId: string) => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${user?.token}` }
      }

      await axios.post(`/api/chat/${chatId}/unblock`, {}, config)

      setChats(chats.map((c: Chat) => 
        c._id === chatId ? { ...c, isBlocked: false } : c
      ) as any)

      toast({
        title: 'Chat unblocked',
        status: 'success',
        duration: 3000,
        isClosable: true
      })
    } catch (error: any) {
      toast({
        title: 'Unblock failed',
        description: error.response?.data?.message || error.message,
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    }
  }

  return (
    <Box
      display={{ base: selectedChat ? 'none' : 'flex', md: 'flex' }}
      flexDir="column"
      p={3}
      w={{ base: '100%', md: '32%' }}
      h="100%"
      overflow="hidden"
      bg="white"
      borderRadius="2xl"
      boxShadow="lg"
    >
      <Flex justify="space-between" align="center" mb={3}>
        <Flex align="center" gap={2}>
          <IconButton
            size="sm"
            variant="ghost"
            icon={<HamburgerIcon />}
            aria-label="toggle chats"
            onClick={() => setShowChats(!showChats)}
          />
          <Text fontSize="2xl" fontWeight="bold">
            My Chats
          </Text>
        </Flex>

        <GroupChatModal>
          <Button size="sm" colorScheme="teal" rightIcon={<AddIcon />}>
            New Group
          </Button>
        </GroupChatModal>
      </Flex>

      <Divider />

      <Collapse in={showChats} style={{ flex: 1, overflow: 'hidden' }}>
        <Box mt={3} overflowY="auto" maxH="100%" css={{
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'gray.300',
            borderRadius: '24px',
          },
        }}>
          {chats && chats.length > 0 ? (
            <Stack spacing={2}>
              {chats.map((chat: Chat) => {
                const isSelected =
                  typeof selectedChat !== 'string' &&
                  selectedChat?._id === chat._id

                const unreadCount = chat.unreadCount || unreadCounts[chat._id] || 0
                const chatName = chat.isGroupChat 
                  ? chat.chatName 
                  : getSender(user, chat.users)

                return (
                  <Flex
                    key={chat._id}
                    p={3}
                    align="center"
                    justify="space-between"
                    bg={isSelected ? 'teal.500' : 'white'}
                    color={isSelected ? 'white' : 'gray.800'}
                    borderRadius="xl"
                    position="relative"
                    _hover={{ bg: isSelected ? 'teal.600' : bgHover }}
                    transition="all 0.2s"
                    borderLeft={unreadCount > 0 && !isSelected ? '4px solid' : 'none'}
                    borderLeftColor="blue.400"
                    boxShadow={unreadCount > 0 && !isSelected ? '0 2px 10px rgba(0,0,0,0.1)' : 'none'}
                  >
                    <Flex
                      align="center"
                      gap={3}
                      flex="1"
                      cursor="pointer"
                      onClick={() => handleChatSelect(chat)} 
                    >
                      <Avatar
                        size="sm"
                        name={chatName}
                        src={chat.isGroupChat ? '' : chat.users.find(u => u._id !== user?._id)?.pic}
                      />

                      <Box flex="1" position="relative">
                        <Flex align="center" gap={2}>
                          <Text 
                            fontWeight={unreadCount > 0 && !isSelected ? 'bold' : '600'} 
                            noOfLines={1}
                            fontSize="md"
                          >
                            {chatName}
                          </Text>
                          
                          {/* Unread Badge - RED color as requested */}
                          {unreadCount > 0 && !isSelected && (
                            <Badge
                              colorScheme="red"
                              borderRadius="full"
                              fontSize="0.7rem"
                              minW="22px"
                              h="22px"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              bg="red.500"
                              color="white"
                              px={1}
                            >
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </Badge>
                          )}
                        </Flex>

                        {chat.latestMessage && (
                          <Text 
                            fontSize="xs" 
                            noOfLines={1} 
                            color={isSelected ? 'whiteAlpha.800' : 'gray.600'}
                            fontWeight={unreadCount > 0 && !isSelected ? 'bold' : 'normal'}
                            mt={1}
                          >
                            {chat.latestMessage.sender._id === user?._id 
                              ? 'You: ' 
                              : chat.latestMessage.sender.name + ': '}
                            {chat.latestMessage.content.length > 30 
                              ? chat.latestMessage.content.substring(0, 30) + '...' 
                              : chat.latestMessage.content}
                          </Text>
                        )}
                      </Box>
                    </Flex>

                    <Box onClick={(e) => e.stopPropagation()}>
                      <Menu placement="bottom-end">
                        <MenuButton
                          as={IconButton}
                          icon={<HamburgerIcon />}
                          size="sm"
                          variant="ghost"
                        />

                        <Portal>
                          <MenuList zIndex="2000">
                            <MenuItem
                              icon={<DeleteIcon />}
                              color="red.500"
                              onClick={() => handleDeleteChat(chat._id)}
                            >
                              Delete Chat
                            </MenuItem>

                            {(chat as ExtendedChat).isBlocked ? (
                              <MenuItem
                                icon={<SmallCloseIcon />}
                                color="green.500"
                                onClick={() => handleUnblockChat(chat._id)}
                              >
                                Unblock Chat
                              </MenuItem>
                            ) : (
                              <MenuItem
                                icon={<SmallCloseIcon />}
                                color="orange.500"
                                onClick={() => handleBlockChat(chat._id)}
                              >
                                Block Chat
                              </MenuItem>
                            )}
                          </MenuList>
                        </Portal>
                      </Menu>
                    </Box>
                  </Flex>
                )
              })}
            </Stack>
          ) : (
            <ChatLoading />
          )}
        </Box>
      </Collapse>
    </Box>
  )
}

export default MyChats