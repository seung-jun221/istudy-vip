export default function Loading({ message = '처리 중...' }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
        <div className="spinner"></div>
        <p className="text-gray-700">{message}</p>
      </div>
    </div>
  );
}
