import { Chat } from '@/components/Chat';

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-purple-50">
      <div className="w-full h-screen">
        <Chat />
      </div>
    </main>
  );
}
