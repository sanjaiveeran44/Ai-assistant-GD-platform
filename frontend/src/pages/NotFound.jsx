import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { SearchX } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
        <SearchX className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2">404</h1>
      <h2 className="text-xl font-medium text-gray-600 mb-8">Page Not Found</h2>
      <p className="text-gray-500 max-w-md mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <Button size="lg" className="px-8 rounded-full shadow-md hover:shadow-lg">
          Return Home
        </Button>
      </Link>
    </div>
  );
};

export default NotFound;
