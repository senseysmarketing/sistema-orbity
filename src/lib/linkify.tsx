import React from "react";

// Regex para detectar URLs
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

interface LinkifyTextProps {
  text: string;
  className?: string;
}

/**
 * Componente que transforma URLs em texto para links clicáveis
 */
export function LinkifyText({ text, className }: LinkifyTextProps) {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (URL_REGEX.test(part)) {
          // Reset lastIndex para evitar problemas com regex global
          URL_REGEX.lastIndex = 0;
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}

/**
 * Função utilitária para verificar se um texto contém URLs
 */
export function containsUrl(text: string): boolean {
  URL_REGEX.lastIndex = 0;
  return URL_REGEX.test(text);
}
