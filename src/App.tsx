import Chat from './Chat.tsx'
import { AppSidebar } from './components/app-sidebar.tsx'
import { SidebarProvider, SidebarTrigger } from './components/ui/sidebar.tsx'
import { cn } from './lib/utils.ts'

export default function App() {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarTrigger />
      <div className="flex flex-col justify-center flex-1">
        <div
          className={cn(
            'flex flex-col max-w-4xl mx-auto relative w-full basis-[100vh] ',
            'has-[.stick-to-bottom:empty]:overflow-visible has-[.stick-to-bottom:empty]:basis-[0px] transition-[flex-basis] duration-200',
          )}
        >
          <Chat />
        </div>
      </div>
    </SidebarProvider>
  )
}
