import Chat from './Chat.tsx'

export default function App() {
  return (
    <div className="h-screen flex flex-col justify-center">
      <div className="max-w-4xl mx-auto p-6 relative w-full basis-[1000px] has-[.stick-to-bottom:empty]:basis-[0px] transition-[flex-basis] duration-200">
        <div className="flex flex-col h-full">
          <h1 className="scroll-m-20 text-2xl lg:text-3xl">Pydantic AI Chat</h1>
          <Chat />
        </div>
      </div>
    </div>
  )
}
