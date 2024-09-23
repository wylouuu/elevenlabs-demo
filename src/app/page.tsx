'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { useState, useRef, useEffect } from 'react';

import { ElevenLabsClient } from 'elevenlabs';

const API_KEY = 'sk_2568ea193180771362ba0586ba30882e384271189d4bd703';
const LEFT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';
const RIGHT_VOICE_ID = 'FGY2WhTYpPnrIDTdsKH5';

const elevenlabs = new ElevenLabsClient({
	apiKey: API_KEY,
});

export default function Home() {
	const [messages, setMessages] = useState([
		{
			id: 1,
			type: 'left',
			text: 'Hello, how can I help you today?',
			audioUrl: null,
			audioLength: 0,
		},
		{
			id: 2,
			type: 'right',
			text: 'I have a question about your product.',
			audioUrl: null,
			audioLength: 0,
		},
	]);
	const [inputText, setInputText] = useState('');

	const [isProcessing, setIsProcessing] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const audioRef = useRef<HTMLAudioElement>(null);

	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.value = messages.map((msg) => msg.text).join('\n');
		}
	}, [messages]);

	const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newText = e.target.value;
		setInputText(newText);

		const newMessages = newText.split('\n').map((text, index) => ({
			id: index + 1,
			type: index % 2 === 0 ? 'left' : 'right',
			text: text.trim(),
			audioUrl: null,
			audioLength: 0,
		}));

		setMessages(newMessages);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			const newMessages = inputText.split('\n').map((text, index) => ({
				id: messages.length + index + 1,
				type: (messages.length + index) % 2 === 0 ? 'left' : 'right',
				text: text.trim(),
				audioUrl: null,
				audioLength: 0,
			}));

			setMessages([...messages, ...newMessages]);
			setInputText('');
		}
	};

	const processConversation = async () => {
		setIsProcessing(true);
		const updatedMessages = [...messages];

		for (let i = 0; i < updatedMessages.length; i++) {
			const message = updatedMessages[i];
			if (!message.audioUrl) {
				const voiceId =
					message.type === 'left' ? LEFT_VOICE_ID : RIGHT_VOICE_ID;

				try {
					const audio = await elevenlabs.generate({
						voice: voiceId,
						text: message.text,
						model_id: 'eleven_multilingual_v2',
					});

					const chunks = [];
					for await (const chunk of audio) {
						chunks.push(chunk);
					}
					const arrayBuffer = Buffer.concat(chunks);
					const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
					const audioUrl = URL.createObjectURL(blob);
					const audioLength = await getAudioDuration(audioUrl);

					updatedMessages[i] = {
						...message,
						audioUrl: audioUrl as unknown as null,
						audioLength,
					};
				} catch (error) {
					console.error('Error generating audio:', error);
				}
			}
		}

		setMessages(updatedMessages);
		setIsProcessing(false);
	};
	const getAudioDuration = (url: string): Promise<number> => {
		return new Promise((resolve) => {
			const audio = new Audio(url);
			audio.addEventListener('loadedmetadata', () => {
				resolve(audio.duration);
			});
		});
	};

	const playAudio = async () => {
		setIsPlaying(true);
		for (const message of messages) {
			if (message.audioUrl) {
				await new Promise<void>((resolve) => {
					if (message.audioUrl) {
						const audio = new Audio(message.audioUrl);
						audio.onended = () => resolve();
						audio.play().catch((error) => {
							console.error('Error playing audio:', error);
							resolve();
						});
					} else {
						resolve();
					}
				});
			}
		}
		setIsPlaying(false);
	};

	const getTotalAudioLength = () => {
		return messages
			.reduce((total, message) => total + message.audioLength, 0)
			.toFixed(2);
	};

	return (
		<main className='flex justify-center'>
			<div className='container flex justify-center'>
				<div className='w-1/2 h-screen flex justify-center items-center flex-col gap-4'>
					<h1 className='text-4xl font-extrabold'>Elevenlabs Demo</h1>
					<Textarea
						ref={textareaRef}
						className='h-1/4'
						placeholder='Type the conversation here, it will switch between left and right voice'
						value={inputText}
						onChange={handleTextareaChange}
						onKeyDown={handleKeyDown}
					/>
					<div className='flex gap-4'>
						<Button
							variant='secondary'
							onClick={processConversation}
							disabled={isProcessing}>
							{isProcessing ? 'Processing...' : 'Process Conversation'}
						</Button>
						<Button
							variant='destructive'
							onClick={playAudio}
							disabled={isPlaying || messages.some((m) => !m.audioUrl)}>
							{isPlaying ? 'Playing...' : 'Play the audio'}
						</Button>
					</div>

					<p>Total audio duration: {getTotalAudioLength()} seconds</p>
					<div>
						{messages.map((message, index) => (
							<p key={message.id}>
								Message {index + 1} duration: {message.audioLength.toFixed(2)}{' '}
								seconds
							</p>
						))}
					</div>
					<audio ref={audioRef} style={{ display: 'none' }} />
				</div>
			</div>
		</main>
	);
}
