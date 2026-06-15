function App() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-indigo-600 mb-2">Zennix</h1>
        <p className="text-gray-500 text-lg mb-8">Spend together. Stay calm.</p>
        <button className="bg-indigo-600 text-white px-8 py-3 rounded-full text-lg font-medium">
          Sign in with Google
        </button>
        <p className="text-gray-400 text-sm mt-6">Free for 1 month. No credit card needed.</p>
      </div>
    </div>
  )
}

export default App