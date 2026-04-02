import { Routes, Route, Navigate } from 'react-router-dom';

import TodosPage from './pages/TodosPage';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/todos" replace />} />
      <Route path="/todos" element={<TodosPage />} />
    </Routes>
  );
};

export default App;
