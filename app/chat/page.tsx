'use client';

import ChatWithAISDK from '@/components/ChatWithAISDK';

/**
 * Chat Page
 *
 * Demonstrates the ChatWithAISDK component using Vercel AI SDK
 * for cleaner streaming integration.
 */
export default function ChatPage() {
  return (
    <div className="container mx-auto py-8 px-4" style={{ height: 'calc(100vh - 4rem)' }}>
      <ChatWithAISDK
        userId="00000000-0000-0000-0000-000000000001"
        initialSystemMessage="I'm ModelLens Assistant. I can help you find AI models, understand saved filters, and analyze filter runs. Ask me anything!"
      />
    </div>
  );
}
