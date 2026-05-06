import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function ComingSoonPage({ title }: { title: string }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-5xl mb-6">🐾</p>
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">{title}</h1>
      <p className="text-zinc-500 text-sm mb-6">Ця сторінка ще в розробці — скоро буде!</p>
      <Button variant="outline" onClick={() => navigate(-1)}>Назад</Button>
    </div>
  )
}
