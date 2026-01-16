import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  ExitToApp,
  Dashboard,
  TrackChanges,
  AdminPanelSettings,
  DirectionsBus
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleClose();
  };

  if (!user) {
    console.log('Navbar: No user found, not showing navbar');
    return null; // Don't show navbar if not logged in
  }

  console.log('Navbar: User authenticated:', user.email, 'Role:', user.role);

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Bus Tracking System
        </Typography>

        <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
          <Button
            color="inherit"
            component={Link}
            to="/dashboard"
            startIcon={<Dashboard />}
          >
            Dashboard
          </Button>

          <Button
            color="inherit"
            component={Link}
            to="/tracking"
            startIcon={<TrackChanges />}
          >
            Live Tracking
          </Button>

          <Button
            color="inherit"
            component={Link}
            to="/driver"
            startIcon={<DirectionsBus />}
          >
            Driver Panel
          </Button>

          {isAdmin && (
            <Button
              color="inherit"
              component={Link}
              to="/admin"
              startIcon={<AdminPanelSettings />}
            >
              Admin Panel
            </Button>
          )}

          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>

          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleClose}>
              <Typography variant="body1">{user.name}</Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>

        {/* Mobile menu */}
        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <MenuIcon />
          </IconButton>

          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem component={Link} to="/dashboard" onClick={handleClose}>
              <Dashboard sx={{ mr: 1 }} />
              Dashboard
            </MenuItem>

            <MenuItem component={Link} to="/tracking" onClick={handleClose}>
              <TrackChanges sx={{ mr: 1 }} />
              Live Tracking
            </MenuItem>

            <MenuItem component={Link} to="/driver" onClick={handleClose}>
              <DirectionsBus sx={{ mr: 1 }} />
              Driver Panel
            </MenuItem>

            {isAdmin && (
              <MenuItem component={Link} to="/admin" onClick={handleClose}>
                <AdminPanelSettings sx={{ mr: 1 }} />
                Admin Panel
              </MenuItem>
            )}

            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
