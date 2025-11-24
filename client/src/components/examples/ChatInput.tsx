import ChatInput from '../ChatInput';

export default function ChatInputExample() {
  return (
    <div className="border rounded-lg">
      <ChatInput
        onSend={(msg, platform) => console.log('Send:', msg, platform)}
        onAnalyze={() => console.log('Analyze conversation')}
        hasMessages={true}
      />
    </div>
  );
}
