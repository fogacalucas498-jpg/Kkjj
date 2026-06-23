import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar, faRobot, faComments, faGear, faArrowLeft, faArrowRight,
  faPlus, faTrash, faCopy, faFileExport, faFileImport, faFloppyDisk,
  faPen, faBook, faMagnifyingGlass, faPaperPlane, faUser, faEllipsis,
  faXmark, faBars, faChevronRight, faCircleCheck, faTriangleExclamation,
  faBolt, faMobileScreen, faLightbulb, faFolderOpen, faLock, faKey,
  faEye, faEyeSlash, faCheck, faSpinner, faQrcode, faStar,
  faRightFromBracket, faArrowsRotate, faCircleInfo, faCircleXmark,
  faMessage, faCircle, faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";

library.add(
  faChartBar, faRobot, faComments, faGear, faArrowLeft, faArrowRight,
  faPlus, faTrash, faCopy, faFileExport, faFileImport, faFloppyDisk,
  faPen, faBook, faMagnifyingGlass, faPaperPlane, faUser, faEllipsis,
  faXmark, faBars, faChevronRight, faCircleCheck, faTriangleExclamation,
  faBolt, faMobileScreen, faLightbulb, faFolderOpen, faLock, faKey,
  faEye, faEyeSlash, faCheck, faSpinner, faQrcode, faStar,
  faRightFromBracket, faArrowsRotate, faCircleInfo, faCircleXmark,
  faMessage, faCircle, faUserCircle, faWhatsapp,
);

export type IconName =
  | "chart-bar" | "robot" | "comments" | "gear" | "arrow-left" | "arrow-right"
  | "plus" | "trash" | "copy" | "file-export" | "file-import" | "floppy-disk"
  | "pen" | "book" | "magnifying-glass" | "paper-plane" | "user" | "ellipsis"
  | "xmark" | "bars" | "chevron-right" | "circle-check" | "triangle-exclamation"
  | "bolt" | "mobile-screen" | "lightbulb" | "folder-open" | "lock" | "key"
  | "eye" | "eye-slash" | "check" | "spinner" | "qrcode" | "star"
  | "right-from-bracket" | "arrows-rotate" | "circle-info" | "circle-xmark"
  | "message" | "circle" | "user-circle" | "whatsapp";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  spin?: boolean;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 14, color, spin, style }: IconProps) {
  const isBrand = name === "whatsapp";
  return (
    <FontAwesomeIcon
      icon={[isBrand ? "fab" : "fas", name as any]}
      spin={spin}
      style={{ fontSize: size, color, verticalAlign: "middle", ...style }}
    />
  );
}
