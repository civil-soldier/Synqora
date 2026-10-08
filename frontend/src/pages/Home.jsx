import react from 'react';
import withAuth from '../utils/withAuth';

function HomeComponent() {
  return (
    <div>
      <h1>Welcome to the Home Page</h1>
      <p>This is the home page of the application.</p>
    </div>
  );
}

export default withAuth(HomeComponent);