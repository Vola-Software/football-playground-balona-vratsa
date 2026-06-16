export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center max-w-lg">
        <div className="text-5xl mb-4">⚽</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Балона Враца
        </h1>
        <p className="text-lg text-gray-500 mb-6">
          Система за резервации на футболни игрища
        </p>
        <p className="text-sm text-gray-400 bg-gray-100 rounded-lg px-4 py-3">
          Приложението се изгражда — скоро тук ще намерите публичния календар с
          наличните часове за двете игрища.
        </p>
      </div>
    </main>
  );
}
