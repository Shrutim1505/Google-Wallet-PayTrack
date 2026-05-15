export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-300 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-600 mb-6">The page you're looking for doesn't exist</p>
        <a href="/" className="text-blue-600 hover:underline font-medium">
          Go to dashboard →
        </a>
      </div>
    </div>
  );
}
