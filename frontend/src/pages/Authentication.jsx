import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import GlobalStyles from '@mui/material/GlobalStyles';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const defaultTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#ffa116',
        },
        background: {
            default: '#09090B',
            paper: '#09090B',
        },
    },

    typography: {
        fontFamily: '"DM Sans", sans-serif',

        button: {
            fontWeight: 600,
            textTransform: 'none',
        },
    },
});

const inputStyle = {
    mb: 1.5,

    '& .MuiOutlinedInput-root': {
        height: 54,
        borderRadius: 1.8,
        background: 'rgba(17, 17, 20, 0.72)',

        '& fieldset': {
            borderColor: 'rgba(255,255,255,0.12)',
        },

        '&:hover fieldset': {
            borderColor: 'rgba(255,255,255,0.22)',
        },

        '&.Mui-focused fieldset': {
            borderColor: '#ffa116',
        },
    },

    '& .MuiInputLabel-root.Mui-focused': {
        color: '#ffa116',
    },
};

export default function Authentication() {

    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [name, setName] = React.useState('');

    const [formState, setFormState] = React.useState(1);

    return (
        <ThemeProvider theme={defaultTheme}>

            <GlobalStyles
                styles={{
                    '@import':
                        'url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap")',

                    '*': {
                        boxSizing: 'border-box',
                    },

                    body: {
                        margin: 0,
                        fontFamily: '"DM Sans", sans-serif',
                    },
                }}
            />

            <CssBaseline />

            <Grid
                container
                component="main"
                sx={{
                    minHeight: '100dvh',
                    overflow: 'hidden',

                    background: `
                        radial-gradient(
                            circle at 10% 10%,
                            rgba(255,161,22,0.13),
                            transparent 28%
                        ),
                        radial-gradient(
                            circle at 85% 85%,
                            rgba(111,58,255,0.13),
                            transparent 32%
                        ),
                        #09090B
                    `,
                }}
            >

                {/* LEFT BRANDING */}

                <Grid
                    item
                    xs={false}
                    md={6}
                    sx={{
                        display: { xs: 'none', md: 'flex' },
                        minHeight: '100dvh',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Box
                        sx={{
                            width: '76%',
                            maxWidth: 560,
                        }}
                    >

                        <Box
                            component="img"
                            src="/logo1.png"
                            alt="Synqora"
                            sx={{
                                width: 175,
                                mb: 5,
                            }}
                        />

                        <Box
                            sx={{
                                fontSize: {
                                    md: '3rem',
                                    lg: '3.45rem',
                                },
                                fontWeight: 700,
                                lineHeight: 1.04,
                                letterSpacing: '-0.035em',
                                color: '#fff',
                                mb: 2.5,
                            }}
                        >
                            Distance shouldn't

                            <Box
                                component="span"
                                sx={{
                                    display: 'block',
                                    color: '#ffa116',
                                }}
                            >
                                feel distant.
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                color: '#9D9DA7',
                                fontSize: '1rem',
                                lineHeight: 1.7,
                                fontWeight: 400,
                                maxWidth: 440,
                            }}
                        >
                            Connect with the people who matter,
                            wherever they are. Simple, personal and
                            built for meaningful conversations.
                        </Box>

                    </Box>
                </Grid>


                {/* AUTH AREA */}

                <Grid
                    item
                    xs={12}
                    md={6}
                    sx={{
                        minHeight: '100dvh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',

                        px: {
                            xs: 2,
                            sm: 4,
                            md: 6,
                        },

                        py: 4,
                    }}
                >

                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 480,

                            p: {
                                xs: 3,
                                sm: 4,
                            },

                            borderRadius: 4,

                            background:
                                'rgba(15, 15, 18, 0.68)',

                            border:
                                '1px solid rgba(255,255,255,0.08)',

                            boxShadow:
                                '0 24px 80px rgba(0,0,0,0.35)',

                            backdropFilter: 'blur(18px)',
                            WebkitBackdropFilter: 'blur(18px)',
                        }}
                    >

                        {/* MOBILE LOGO */}

                        <Box
                            sx={{
                                display: {
                                    xs: 'flex',
                                    md: 'none',
                                },

                                justifyContent: 'center',
                                mb: 4,
                            }}
                        >
                            <Box
                                component="img"
                                src="/logo1.png"
                                alt="Synqora"
                                sx={{
                                    width: 145,
                                }}
                            />
                        </Box>


                        {/* HEADER */}

                        <Box
                            sx={{
                                textAlign: 'center',
                                mb: 3,
                            }}
                        >

                            <Avatar
                                sx={{
                                    mx: 'auto',
                                    mb: 1.5,
                                    width: 50,
                                    height: 50,

                                    bgcolor:
                                        'rgba(255,161,22,0.10)',

                                    color: '#ffa116',

                                    border:
                                        '1px solid rgba(255,161,22,0.28)',
                                }}
                            >
                                <LockOutlinedIcon fontSize="small" />
                            </Avatar>

                            <Box
                                sx={{
                                    color: '#fff',
                                    fontSize: '1.55rem',
                                    fontWeight: 600,
                                    letterSpacing: '-0.02em',
                                    mb: 0.7,
                                }}
                            >
                                {formState === 0
                                    ? 'Welcome back'
                                    : 'Create your account'}
                            </Box>

                            <Box
                                sx={{
                                    color: '#777780',
                                    fontSize: '0.9rem',
                                }}
                            >
                                {formState === 0
                                    ? 'Sign in to continue to Synqora'
                                    : 'Join Synqora and start connecting'}
                            </Box>

                        </Box>


                        {/* SIGN IN / SIGN UP */}

                        <Box
                            sx={{
                                display: 'flex',
                                p: 0.45,
                                mb: 2.5,

                                borderRadius: 2.2,

                                background:
                                    'rgba(17,17,20,0.72)',

                                border:
                                    '1px solid rgba(255,255,255,0.07)',
                            }}
                        >

                            <Button
                                fullWidth
                                variant={
                                    formState === 0
                                        ? 'contained'
                                        : 'text'
                                }
                                onClick={() => setFormState(0)}
                                sx={{
                                    height: 42,
                                    borderRadius: 1.8,
                                    fontSize: '0.86rem',
                                    fontWeight: 600,

                                    color:
                                        formState === 0
                                            ? '#080808'
                                            : '#777780',

                                    backgroundColor:
                                        formState === 0
                                            ? '#ffa116'
                                            : 'transparent',

                                    '&:hover': {
                                        backgroundColor:
                                            formState === 0
                                                ? '#ffad2f'
                                                : 'rgba(255,255,255,0.04)',
                                    },
                                }}
                            >
                                Sign In
                            </Button>

                            <Button
                                fullWidth
                                variant={
                                    formState === 1
                                        ? 'contained'
                                        : 'text'
                                }
                                onClick={() => setFormState(1)}
                                sx={{
                                    height: 42,
                                    borderRadius: 1.8,
                                    fontSize: '0.86rem',
                                    fontWeight: 600,

                                    color:
                                        formState === 1
                                            ? '#080808'
                                            : '#777780',

                                    backgroundColor:
                                        formState === 1
                                            ? '#ffa116'
                                            : 'transparent',

                                    '&:hover': {
                                        backgroundColor:
                                            formState === 1
                                                ? '#ffad2f'
                                                : 'rgba(255,255,255,0.04)',
                                    },
                                }}
                            >
                                Sign Up
                            </Button>

                        </Box>


                        {/* FORM */}

                        <Box
                            component="form"
                            noValidate
                            sx={{
                                minHeight: 258,
                            }}
                        >

                            {formState === 1 && (
                                <TextField
                                    margin="dense"
                                    required
                                    fullWidth
                                    id="name"
                                    label="Full Name"
                                    name="name"
                                    value={name}
                                    onChange={(e) =>
                                        setName(e.target.value)
                                    }
                                    sx={inputStyle}
                                />
                            )}

                            <TextField
                                margin="dense"
                                required
                                fullWidth
                                id="username"
                                label="Username"
                                name="username"
                                value={username}
                                autoFocus={formState === 0}
                                onChange={(e) =>
                                    setUsername(e.target.value)
                                }
                                sx={inputStyle}
                            />

                            <TextField
                                margin="dense"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                value={password}
                                type="password"
                                id="password"
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                sx={inputStyle}
                            />

                            <Button
                                type="button"
                                fullWidth
                                variant="contained"
                                sx={{
                                    mt: 1,
                                    height: 50,
                                    borderRadius: 1.8,

                                    background: '#ffa116',
                                    color: '#080808',

                                    fontSize: '0.95rem',
                                    fontWeight: 600,

                                    boxShadow:
                                        '0 8px 24px rgba(255,161,22,0.12)',

                                    '&:hover': {
                                        background: '#ffad2f',
                                    },
                                }}
                            >
                                {formState === 0
                                    ? 'Sign In'
                                    : 'Create Account'}
                            </Button>

                        </Box>


                        {/* FOOTER */}

                        <Box
                            sx={{
                                mt: 2,
                                textAlign: 'center',
                                color: '#55555E',
                                fontSize: '0.74rem',
                                lineHeight: 1.5,
                            }}
                        >
                            By continuing, you agree to Synqora's
                            terms and privacy policy.
                        </Box>

                    </Box>

                </Grid>

            </Grid>

        </ThemeProvider>
    );
}