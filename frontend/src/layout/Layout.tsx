import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Layout.module.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.menuToggle}
        onClick={() => setMenuOpen(true)}
        aria-label="Открыть меню"
      >
        <span className={styles.menuToggleBar} />
        <span className={styles.menuToggleBar} />
        <span className={styles.menuToggleBar} />
      </button>
      <div
        className={`${styles.overlay} ${menuOpen ? styles.overlayOpen : ''}`}
        onClick={closeMenu}
        aria-hidden={!menuOpen}
      />
      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <img src="/logo.jpeg" alt="Логотип" className={styles.logo} />
          <span>FireNotify</span>
          <button type="button" className={styles.sidebarClose} onClick={closeMenu} aria-label="Закрыть меню">
            ×
          </button>
        </div>
        <nav className={styles.nav} onClick={closeMenu}>
          <NavLink to="/" end className={({ isActive }) => (isActive ? styles.active : '')}>
            Панель
          </NavLink>
          <NavLink to="/notifications" className={({ isActive }) => (isActive ? styles.active : '')}>
            Уведомления
          </NavLink>
          <NavLink to="/send-message" className={({ isActive }) => (isActive ? styles.active : '')}>
            Отправить заявку
          </NavLink>
          <NavLink to="/questionnaires" className={({ isActive }) => (isActive ? styles.active : '')}>
            Опросники
          </NavLink>
          <NavLink to="/messages" className={({ isActive }) => (isActive ? styles.active : '')}>
            {isAdmin ? 'Заявки (проверка)' : 'Заявки'}
          </NavLink>
          {isAdmin && (
            <NavLink to="/users" className={({ isActive }) => (isActive ? styles.active : '')}>
              Пользователи
            </NavLink>
          )}
          <NavLink to="/reports" className={({ isActive }) => (isActive ? styles.active : '')}>
            Отчёты
          </NavLink>
          <NavLink to="/notification-center" className={({ isActive }) => (isActive ? styles.active : '')}>
            Центр уведомлений
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? styles.active : '')}>
            Настройки
          </NavLink>
        </nav>
        <div className={styles.user}>
          <span>{user?.name ?? user?.login}</span>
          <span className={styles.role}>{user?.role}</span>
          <button type="button" onClick={handleLogout} className={styles.logout}>
            Выйти
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
