import './Loading.css';

function Loading({ message = 'Loading...' }) {
  return (
    <div className="loading">
      <div className="loading__spinner" aria-hidden="true" />
      <p className="loading__message">{message}</p>
    </div>
  );
}

export default Loading;




