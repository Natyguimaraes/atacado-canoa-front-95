import { useState, useEffect } from 'react';

const WalkingCharacter = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [character, setCharacter] = useState('🚶‍♂️');

  const characters = ['🚶‍♂️', '🚶‍♀️', '🏃‍♂️', '🏃‍♀️', '🧑‍🦯', '👨‍🦯', '👩‍🦯'];

  useEffect(() => {
    const showCharacter = () => {
      // Aparece a cada 15-30 segundos aleatoriamente
      const randomDelay = Math.random() * 15000 + 15000;
      
      setTimeout(() => {
        setDirection(Math.random() > 0.5 ? 'left' : 'right');
        setCharacter(characters[Math.floor(Math.random() * characters.length)]);
        setIsVisible(true);
        
        // Esconde o personagem após a animação
        setTimeout(() => {
          setIsVisible(false);
          showCharacter(); // Programa a próxima aparição
        }, 12000);
        
      }, randomDelay);
    };

    showCharacter();
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`walking-character walk-${direction}`}>
      {character}
    </div>
  );
};

export default WalkingCharacter;