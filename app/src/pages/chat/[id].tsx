import React, { useEffect, useState } from 'react';
import { Flex, Input, Button, Text, useToast, HStack, VStack, IconButton, Divider, useDisclosure } from '@chakra-ui/react';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/router';
import { Navbar } from '@/components/Navbar';
import { ChatIcon, CopyIcon, PlusSquareIcon } from '@chakra-ui/icons';
import { anchorProgram } from '@/util/helper';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { fetchChatUserAccount } from '@/util/program/fetchChatUserAccount';
import { sendMessage } from '@/util/program/sendMessage';
import { joinRoom } from '@/util/program/joinRoom';
import { CreateUserModal } from '@/components/CreateUserModal';
const axios = require('axios');

const ChatRoom: React.FC = () => {
  const wallet = useAnchorWallet();
  const [chats, setChats] = useState<any[]>([]);
  const [guests, setGuests] = useState<string[]>([]);
  const [creator, setCreator] = useState<string>();
  const [chatUser, setChatUser] = useState<any>();
  const [walletExists, setWalletExists] = useState<boolean>(false); 
  const toast = useToast();
  const router = useRouter();
  const [newMessage, setNewMessage] = useState<string>("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { id } = router.query;
  const [newGuest, setNewGuest] = useState<string>("");
  const [localStorageInput, setLocalStorageInput] = useState<string>("");

  const handleSendMessage = async () => {
    console.log(Number(id), chatUser.id, newMessage, chatUser.name);
    const res = await sendMessage(wallet as NodeWallet, Number(id), chatUser.id, newMessage, chatUser.name);
    setNewMessage("");
    if (res.error) {
      toast({
        status: "error",
        title: res.error
      });
      return;
    }
  };

  const checkGuestWallet = async (walletAddress: object): Promise<boolean> => {
    try {
        const response = await axios.post('/api/checkguest', { walletAddress, roomId: id });
        return response.data.exists;
    } catch (error) {
        console.error('Error checking wallet address:', error);
        return false;
    }
  };

  const handleSaveToLocalStorage = async () => {
    const inputObject = { guest: localStorageInput, roomId: id };
    localStorage.setItem('chatInput', JSON.stringify(inputObject));
    setLocalStorageInput("");
    const guestString = localStorage.getItem('chatInput');
    if (guestString) {
      const guest = JSON.parse(guestString);
      const success = await inviteGuest(guest);
      if (success) {
        toast({
          status: 'success',
          title: 'Guest invited successfully',
        });
      } 
    }
  };
  
  const inviteGuest = async (guest: { guest: string, roomId: string }): Promise<boolean> => {
    try {
      const response = await axios.post('/api/inviteguest', guest);
      return response.data.success;
    } catch (error) {
      console.error('Error inviting guest:', error);
      return false;
    }
  };
  

  const generateRoomLink = (): string => {
    return window.location.href;
  };


  const copyRoomLink = () => {
    const roomLink = generateRoomLink();
    navigator.clipboard.writeText(roomLink);
    toast({
      title: "Room link copied to clipboard",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  useEffect(() => {
    if (!wallet || !id) return;

    const fetchData = async () => {
      const program = anchorProgram(wallet as NodeWallet);

      // @ts-ignore
      const chatRoomData = await program.account.chatroom.all([
        {
          memcmp: {
            offset: 8,
            bytes: bs58.encode(Uint8Array.from([Number(id)])),
          },
        },
      ]);

      if (!chatRoomData || !chatRoomData.length) {
        toast({
          status: 'error',
          title: 'Unable to fetch chat room details',
        });
        return;
      } else {
        const history = JSON.parse(chatRoomData[0].account.chats);
        const creator = chatRoomData[0].account.creator.toBase58();
        const guests = chatRoomData[0].account.guests.map((g: any) => g.toBase58());
        setGuests(guests);
        setCreator(creator);
        console.log(history);
        setChats(history);
      }

      const chatUser = await fetchChatUserAccount(wallet as NodeWallet);
      console.log(chatUser);
      if (chatUser.error || !chatUser.accounts || !chatUser.accounts.length) {
        return;
      }
      const details = chatUser.accounts[0].account;
      console.log(details);
      setChatUser(details);
    };

    fetchData();

    const interval = setInterval(fetchData, 600);

    return () => clearInterval(interval);
  }, [wallet]);

  useEffect(() => {
    if (!wallet) return;

    const walletData = { publicKey: wallet.publicKey };
    checkGuestWallet(walletData).then(exists => {
      setWalletExists(exists);
    });  
  }, [wallet]);

  const handleJoin = async () => {
    if (!chatUser) {
      toast({
        status: "error",
        title: "First create chat user and try again"
      });
      onOpen();
      return;
    }
    const res = await joinRoom(wallet as NodeWallet, Number(id), chatUser.id);
    console.log(res);
  };

  return (
    <>
      <Navbar />
      <CreateUserModal isOpen={isOpen} onClose={onClose} />
      <Flex bg="#232735" h="95vh" gap="3rem" overflow="hidden" w="100%" align="center" justify="center">
        <Flex w="500px" h="700px" borderWidth="1px" flexFlow="column" justify="space-between" borderRadius="lg" overflow="scroll">
          <Flex direction="column" p={4} flex="1" overflowY="auto">
            {chats && chats.map((message: any, index: number) => (
              <React.Fragment key={index}>
                <Flex justify={chatUser && message.username === chatUser.name ? "end" : "start"} padding="0 10px" align="flex-start" mb={1}>
                  <VStack align={chatUser && message.username === chatUser.name ? "end" : "start"} spacing={0} padding="0 1rem" bg={chatUser && message.username === chatUser.name ? "#435eae" : "#3a435e"} rounded="5px">
                    <Text fontSize="1.4rem" color="white" fontWeight="bold" textAlign="end">
                      {message.username}
                    </Text>
                    <Text color="gray.200" mt="-4px !important" fontSize="1.2rem">{message.message}</Text>
                  </VStack>
                </Flex>
                <Text color="gray.500" textAlign={chatUser && message.username === chatUser.name ? "end" : "start"}>{new Date(message.date).toLocaleTimeString()}</Text>
              </React.Fragment>
            ))}
          </Flex>
          <HStack p={2} bg="gray.600">
            <Input
              color='white'
              disabled={wallet ? creator != wallet.publicKey && !guests.includes(wallet?.publicKey.toBase58()) : true}
              fontSize="1.2rem"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <IconButton
              aria-label="Send"
              icon={<ChatIcon color="white" />}
              bg="blue.500"
              onClick={handleSendMessage}
              isDisabled={!newMessage}
            />
          </HStack>
        </Flex>
        <Flex maxWidth="300px" overflow="hidden" display="block" padding="0.5rem 0.5rem" justify="space-between" flexFlow="column" align="start" bg="#424e64" rounded="5px">
          <Flex flexFlow="column" align="start" justify="start">
            <Text fontWeight="bold" color="white" fontSize="1.3rem" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" maxWidth="100%">
              Creator
            </Text>
            <Text fontSize="1.2rem" color="gray.200" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" maxWidth="100%">
              {creator}
            </Text>
            <Divider />
            <Text fontWeight="bold" color="white" fontSize="1.3rem" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" maxWidth="100%">
              Guests
            </Text>
            {guests && guests.length ? (
              guests.map((g) => (
                <Text key={g} fontSize="1.2rem" color="gray.200" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" maxWidth="100%">
                  {g}
                </Text>
              ))
            ) : (
              <Text fontSize="1.1rem" color="gray.200" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" maxWidth="100%">
                No guests here
              </Text>
            )}
            <Divider />
          </Flex>
          {wallet && creator != wallet.publicKey && !guests.includes(wallet?.publicKey.toBase58()) && walletExists ? (
            <><Text fontWeight="bold" color="white" fontSize="1.3rem" mb={4}>
              You were invited by the creator of the room - <Text color="lightblue">{creator}</Text>
            </Text><Button colorScheme="telegram" w="100%" fontSize="1.3rem" onClick={handleJoin}>
                Join Chat Room
              </Button></>
          ) : null}
          <Divider />
          {creator === wallet?.publicKey && (
  <Text fontWeight="bold" color="white" fontSize="1.3rem" mb={2}>
    Invite a new guest
  </Text>
)}

{creator == wallet?.publicKey && (
  <HStack>
    <Input
      color="white"
      fontSize="1.2rem"
      placeholder="Enter wallet address"
      value={localStorageInput}
      onChange={(e) => setLocalStorageInput(e.target.value)}
    />
    <Button colorScheme="blue" onClick={handleSaveToLocalStorage}>
      <PlusSquareIcon />
    </Button>
  </HStack>
)}
{creator == wallet?.publicKey && (
<Button 
            colorScheme="blue" 
            w="100%" 
            fontSize="1.3rem" 
            onClick={copyRoomLink}            
            leftIcon={<CopyIcon />} 
          >
            Copy Room Link
          </Button>
)}
        </Flex>
      </Flex>
    </>
  );
};


export default ChatRoom;
