import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="surface p-10 sm:p-14 text-center max-w-lg w-full"
      >
        <span className="chip-lavender mb-4 inline-flex">CampusLink</span>
        <p className="font-display text-7xl sm:text-8xl text-primary-500 leading-none mb-4">
          404
        </p>
        <h1 className="font-display text-2xl sm:text-3xl text-ink mb-3">
          Page not found
        </h1>
        <p className="section-copy mx-auto text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-primary px-6 py-3">
            <Home className="h-5 w-5" />
            Go home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btn-secondary px-6 py-3"
          >
            <ArrowLeft className="h-5 w-5" />
            Go back
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
