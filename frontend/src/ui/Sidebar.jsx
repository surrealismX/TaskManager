import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  FolderIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

export default function Sidebar() {
  const links = [
    { to: "/", icon: <HomeIcon className="w-6 h-6" />, label: "Dashboard" },
    { to: "/", icon: <FolderIcon className="w-6 h-6" />, label: "Projects" },
    { to: "/finance", icon: <BanknotesIcon className="w-6 h-6" />, label: "Finance" },
  ];

  return (
    <aside
      className="
        fixed left-4 top-1/2 -translate-y-1/2
        flex flex-col items-center gap-4
        p-4 rounded-2xl
        backdrop-blur-xl
        bg-[rgba(255,255,255,0.08)]
        border border-[rgba(255,255,255,0.15)]
        shadow-xl
        transition-all duration-300
        hover:w-48 w-16
        group
        z-40
      "
    >
      {links.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          className={({ isActive }) =>
            `
            flex items-center gap-3 w-full
            px-3 py-2 rounded-xl
            transition-all duration-200
            text-[var(--text)]
            ${isActive ? "bg-[rgba(255,255,255,0.15)]" : "hover:bg-[rgba(255,255,255,0.1)]"}
          `
          }
        >
          {item.icon}
          <span
            className="
              opacity-0 group-hover:opacity-100
              transition-opacity duration-300
              whitespace-nowrap
            "
          >
            {item.label}
          </span>
        </NavLink>
      ))}
    </aside>
  );
}
