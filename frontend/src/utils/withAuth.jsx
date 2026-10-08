import { useNavigate , UseEffect } from 'react-router-dom';

const withAuth = (WrappedComponent) =>{
    const AuthComponent = (props) => {
        const router = useNavigate();

        const isAuthenticated = () => {
            if(localStorage.getItem('token')) {
                return true;
            } else {
                return false;
            }

            UseEffect(() => {
                if(!isAuthenticated()) {
                    router('/auth');
                }
            }, []);

            return <WrappedComponent {...props} />;
        }
        return AuthComponent;
    }
}

export default withAuth;
