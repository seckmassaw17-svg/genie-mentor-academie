import React, { useState, useEffect } from "react";
import officialLogoPng from "../assets/images/regenerated_image_1789972626630.png";
import { useAppLogo, SUPABASE_STORAGE_LOGO_URL } from "../utils/assetImages";

export interface AppLogoProps {
  /** Classes CSS supplémentaires pour le conteneur ou l'image (largeur, hauteur, bordures, etc.) */
  className?: string;
  /** Taille optionnelle ou variante (ex: 'sm', 'md', 'lg', 'xl' ou nombre) */
  size?: string | number;
  /** Texte alternatif pour l'accessibilité */
  alt?: string;
  /** URL personnalisée pour prévisualiser temporairement (ex: dans l'espace Admin avant sauvegarde) */
  customUrl?: string;
  /** Forcer l'affichage de l'icône vectorielle officielle au lieu de l'image distante */
  forceVector?: boolean;
  /** Gestion du clic éventuel */
  onClick?: () => void;
  /** Titre ou tooltip au survol */
  title?: string;
}

/**
 * Composant officiel <AppLogo /> pour Savoir+ Sénégal.
 * Affiche systématiquement l'image officielle envoyée (livre d'or et étoile sur fond bleu royal).
 */
export const AppLogo: React.FC<AppLogoProps> = ({
  className = "w-10 h-10 rounded-xl",
  alt = "Génie Mentor Académie Logo Officiel",
  customUrl,
  onClick,
  title = "Génie Mentor Académie (GMA)",
}) => {
  const dynamicLogo = useAppLogo();
  
  // Priorité : customUrl > dynamicLogo > officialLogoPng > "/logo.png" > SUPABASE_STORAGE_LOGO_URL
  const primarySource = customUrl || dynamicLogo || officialLogoPng || "/logo.png" || SUPABASE_STORAGE_LOGO_URL;

  // Appliquer le cache-buster si URL HTTP
  const targetUrl = (primarySource && primarySource.startsWith("http") && !primarySource.includes("?v=") && !primarySource.includes("&v="))
    ? `${primarySource}${primarySource.includes("?") ? "&" : "?"}v=1.0.0`
    : primarySource;

  const [imgSrc, setImgSrc] = useState<string>(targetUrl);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const nextTarget = customUrl || dynamicLogo || officialLogoPng || "/logo.png" || SUPABASE_STORAGE_LOGO_URL;
    const resolvedUrl = (nextTarget && nextTarget.startsWith("http") && !nextTarget.includes("?v=") && !nextTarget.includes("&v="))
      ? `${nextTarget}${nextTarget.includes("?") ? "&" : "?"}v=1.0.0`
      : nextTarget;
    setImgSrc(resolvedUrl);
    setIsLoaded(false);
  }, [customUrl, dynamicLogo]);

  const handleImageError = () => {
    // Si la source distante ou custom échoue, basculer sur l'image locale officielle
    if (imgSrc !== officialLogoPng && imgSrc !== "/logo.png") {
      setImgSrc(officialLogoPng || "/logo.png");
    }
  };

  return (
    <div
      onClick={onClick}
      title={title}
      className={`relative inline-flex items-center justify-center overflow-hidden bg-[#0A1964] select-none shrink-0 ${className}`}
      style={{ aspectRatio: "1/1" }}
      role="img"
      aria-label={alt}
    >
      <img
        src={imgSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-150 ${
          isLoaded ? "opacity-100" : "opacity-95"
        }`}
        loading="eager"
        decoding="sync"
        onLoad={() => setIsLoaded(true)}
        onError={handleImageError}
      />
    </div>
  );
};

export default AppLogo;

