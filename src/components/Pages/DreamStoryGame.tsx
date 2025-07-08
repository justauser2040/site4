import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, VolumeX, Gamepad2, Sparkles, Moon, Star, Heart, Zap, Coffee, Dumbbell, Droplets, Utensils, Bed } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface DreamStoryGameProps {
  onBack: () => void;
}

interface GameState {
  energy: number;
  happiness: number;
  health: number;
  hunger: number;
  thirst: number;
  cleanliness: number;
  sleepiness: number;
  time: number; // 0-23 (hours)
  day: number;
  currentRoom: 'bedroom' | 'living' | 'kitchen' | 'gym' | 'bathroom';
  gameStyle: 'isometric' | '2d';
  isPlaying: boolean;
  gameSpeed: number;
  volume: number;
  isMuted: boolean;
  lastActions: string[];
  specialEvents: string[];
  achievements: string[];
}

interface GameObject {
  id: string;
  name: string;
  room: string;
  action: string;
  effects: {
    energy?: number;
    happiness?: number;
    health?: number;
    hunger?: number;
    thirst?: number;
    cleanliness?: number;
    sleepiness?: number;
  };
  timeRequired: number;
  available: (state: GameState) => boolean;
  cooldown?: number;
  lastUsed?: number;
}

const DreamStoryGame: React.FC<DreamStoryGameProps> = ({ onBack }) => {
  const { isDark } = useTheme();
  const gameLoopRef = useRef<NodeJS.Timeout>();
  const audioRef = useRef<HTMLAudioElement>();

  const [gameState, setGameState] = useState<GameState>({
    energy: 80,
    happiness: 70,
    health: 85,
    hunger: 60,
    thirst: 70,
    cleanliness: 80,
    sleepiness: 30,
    time: 8, // 8 AM
    day: 1,
    currentRoom: 'bedroom',
    gameStyle: 'isometric',
    isPlaying: false,
    gameSpeed: 1,
    volume: 0.3,
    isMuted: false,
    lastActions: [],
    specialEvents: [],
    achievements: []
  });

  const gameObjects: GameObject[] = [
    {
      id: 'bed',
      name: 'Cama',
      room: 'bedroom',
      action: 'sleep',
      effects: { energy: 40, sleepiness: -60, health: 10 },
      timeRequired: 8,
      available: (state) => state.sleepiness > 40 || state.time >= 22 || state.time <= 6,
      cooldown: 12
    },
    {
      id: 'computer',
      name: 'Computador',
      room: 'bedroom',
      action: 'relax',
      effects: { happiness: 20, energy: -10, sleepiness: 5 },
      timeRequired: 2,
      available: (state) => state.energy > 20,
      cooldown: 1
    },
    {
      id: 'wardrobe',
      name: 'Guarda-roupa',
      room: 'bedroom',
      action: 'relax',
      effects: { happiness: 10, cleanliness: 5 },
      timeRequired: 1,
      available: () => true,
      cooldown: 2
    },
    {
      id: 'sofa',
      name: 'Sofá',
      room: 'living',
      action: 'relax',
      effects: { happiness: 15, energy: 5, sleepiness: 10 },
      timeRequired: 2,
      available: () => true,
      cooldown: 1
    },
    {
      id: 'tv',
      name: 'TV',
      room: 'living',
      action: 'relax',
      effects: { happiness: 25, energy: -5, sleepiness: 15 },
      timeRequired: 3,
      available: () => true,
      cooldown: 1
    },
    {
      id: 'bookshelf',
      name: 'Estante',
      room: 'living',
      action: 'relax',
      effects: { happiness: 20, health: 5, sleepiness: 20 },
      timeRequired: 2,
      available: () => true,
      cooldown: 1
    },
    {
      id: 'videogame',
      name: 'Videogame',
      room: 'living',
      action: 'relax',
      effects: { happiness: 30, energy: -15, sleepiness: -5 },
      timeRequired: 3,
      available: (state) => state.energy > 25,
      cooldown: 2
    },
    {
      id: 'table',
      name: 'Mesa',
      room: 'kitchen',
      action: 'eat',
      effects: { hunger: -50, happiness: 15, energy: 20 },
      timeRequired: 1,
      available: (state) => state.hunger > 30,
      cooldown: 3
    },
    {
      id: 'fridge',
      name: 'Geladeira',
      room: 'kitchen',
      action: 'eat',
      effects: { hunger: -30, thirst: -20, happiness: 10 },
      timeRequired: 1,
      available: (state) => state.hunger > 20 || state.thirst > 30,
      cooldown: 2
    },
    {
      id: 'stove',
      name: 'Fogão',
      room: 'kitchen',
      action: 'eat',
      effects: { hunger: -60, happiness: 25, energy: 15 },
      timeRequired: 2,
      available: (state) => state.hunger > 40,
      cooldown: 4
    },
    {
      id: 'microwave',
      name: 'Microondas',
      room: 'kitchen',
      action: 'eat',
      effects: { hunger: -40, happiness: 10, energy: 10 },
      timeRequired: 1,
      available: (state) => state.hunger > 25,
      cooldown: 2
    },
    {
      id: 'water',
      name: 'Água',
      room: 'kitchen',
      action: 'drinkWater',
      effects: { thirst: -40, health: 10, energy: 5 },
      timeRequired: 1,
      available: (state) => state.thirst > 20,
      cooldown: 1
    },
    {
      id: 'exercise',
      name: 'Equipamento',
      room: 'gym',
      action: 'exercise',
      effects: { health: 25, energy: -20, happiness: 20, sleepiness: -10 },
      timeRequired: 2,
      available: (state) => state.energy > 30,
      cooldown: 3
    },
    {
      id: 'treadmill',
      name: 'Esteira',
      room: 'gym',
      action: 'exercise',
      effects: { health: 30, energy: -25, happiness: 15, sleepiness: -15 },
      timeRequired: 3,
      available: (state) => state.energy > 35,
      cooldown: 4
    },
    {
      id: 'dumbbells',
      name: 'Halteres',
      room: 'gym',
      action: 'exercise',
      effects: { health: 20, energy: -15, happiness: 10, sleepiness: -5 },
      timeRequired: 1,
      available: (state) => state.energy > 25,
      cooldown: 2
    },
    {
      id: 'yoga-mat',
      name: 'Tapete de Yoga',
      room: 'gym',
      action: 'exercise',
      effects: { health: 15, energy: 5, happiness: 25, sleepiness: 10 },
      timeRequired: 2,
      available: () => true,
      cooldown: 2
    },
    {
      id: 'shower',
      name: 'Chuveiro',
      room: 'bathroom',
      action: 'shower',
      effects: { cleanliness: 60, happiness: 20, energy: 10, sleepiness: -10 },
      timeRequired: 1,
      available: (state) => state.cleanliness < 80,
      cooldown: 2
    },
    {
      id: 'bathroom-sink',
      name: 'Pia',
      room: 'bathroom',
      action: 'shower',
      effects: { cleanliness: 20, happiness: 5, thirst: -10 },
      timeRequired: 1,
      available: (state) => state.cleanliness < 90,
      cooldown: 1
    },
    {
      id: 'toilet',
      name: 'Vaso Sanitário',
      room: 'bathroom',
      action: 'shower',
      effects: { happiness: 10, health: 5 },
      timeRequired: 1,
      available: () => true,
      cooldown: 2
    },
    {
      id: 'skincare',
      name: 'Produtos de Beleza',
      room: 'bathroom',
      action: 'shower',
      effects: { cleanliness: 30, happiness: 25, health: 10 },
      timeRequired: 2,
      available: () => true,
      cooldown: 3
    }
  ];

  // Situações especiais que podem acontecer
  const specialSituations = [
    {
      id: 'perfect_morning',
      name: '🌅 Manhã Perfeita',
      description: 'Você acordou naturalmente e se sente revigorado!',
      condition: (state: GameState) => state.time >= 6 && state.time <= 8 && state.energy > 70 && state.sleepiness < 20,
      effects: { happiness: 30, energy: 20, health: 15 },
      chance: 0.8 // 80% de chance
    },
    {
      id: 'workout_motivation',
      name: '💪 Motivação Total',
      description: 'Você está se sentindo super motivado para se exercitar!',
      condition: (state: GameState) => state.currentRoom === 'gym' && state.energy > 50 && state.health > 60,
      effects: { happiness: 25, energy: 15, health: 20 },
      chance: 0.8
    },
    {
      id: 'cooking_inspiration',
      name: '👨‍🍳 Inspiração Culinária',
      description: 'Você teve uma ideia incrível para uma receita deliciosa!',
      condition: (state: GameState) => state.currentRoom === 'kitchen' && state.hunger > 40 && state.happiness > 50,
      effects: { happiness: 35, hunger: -30, energy: 10 },
      chance: 0.8
    },
    {
      id: 'relaxing_bath',
      name: '🛁 Banho Relaxante',
      description: 'Este banho está sendo extremamente relaxante e revigorante!',
      condition: (state: GameState) => state.currentRoom === 'bathroom' && state.cleanliness < 60 && state.energy < 50,
      effects: { cleanliness: 40, happiness: 30, energy: 25 },
      chance: 0.8
    },
    {
      id: 'gaming_flow',
      name: '🎮 Estado de Flow',
      description: 'Você entrou em um estado de flow incrível jogando!',
      condition: (state: GameState) => state.currentRoom === 'living' && state.happiness > 60 && state.energy > 40,
      effects: { happiness: 40, energy: -5, sleepiness: -10 },
      chance: 0.8
    },
    {
      id: 'power_nap',
      name: '😴 Cochilo Perfeito',
      description: 'Um cochilo rápido que te deixou completamente renovado!',
      condition: (state: GameState) => state.currentRoom === 'bedroom' && state.sleepiness > 30 && state.time >= 13 && state.time <= 16,
      effects: { energy: 30, sleepiness: -25, happiness: 15 },
      chance: 0.8
    },
    {
      id: 'hydration_boost',
      name: '💧 Hidratação Perfeita',
      description: 'Você se sente perfeitamente hidratado e energizado!',
      condition: (state: GameState) => state.thirst < 30 && state.health > 70,
      effects: { thirst: -40, energy: 20, health: 15 },
      chance: 0.8
    },
    {
      id: 'social_energy',
      name: '📱 Energia Social',
      description: 'Uma conversa online te deixou super animado!',
      condition: (state: GameState) => state.currentRoom === 'bedroom' && state.happiness < 50 && state.energy > 30,
      effects: { happiness: 35, energy: 10, sleepiness: -5 },
      chance: 0.8
    },
    {
      id: 'midnight_snack',
      name: '🌙 Lanche da Madrugada',
      description: 'Um lanche noturno que satisfez perfeitamente sua fome!',
      condition: (state: GameState) => state.time >= 22 || state.time <= 2 && state.hunger > 50 && state.currentRoom === 'kitchen',
      effects: { hunger: -40, happiness: 25, sleepiness: 15 },
      chance: 0.8
    },
    {
      id: 'morning_stretch',
      name: '🧘‍♂️ Alongamento Matinal',
      description: 'Um alongamento matinal que despertou todo seu corpo!',
      condition: (state: GameState) => state.time >= 6 && state.time <= 9 && state.currentRoom === 'gym' && state.energy < 60,
      effects: { energy: 25, health: 20, happiness: 20, sleepiness: -15 },
      chance: 0.8
    }
  ];

  useEffect(() => {
    // Inicializar áudio
    if (audioRef.current) {
      audioRef.current.volume = gameState.volume;
      audioRef.current.muted = gameState.isMuted;
    }
  }, []);

  useEffect(() => {
    if (gameState.isPlaying) {
      gameLoopRef.current = setInterval(() => {
        setGameState(prevState => {
          const newState = { ...prevState };
          
          // Avançar tempo
          newState.time += 0.5 * newState.gameSpeed;
          if (newState.time >= 24) {
            newState.time = 0;
            newState.day += 1;
          }
          
          // Degradação natural dos stats
          if (Math.random() < 0.3) {
            newState.energy = Math.max(0, newState.energy - 1);
            newState.hunger = Math.min(100, newState.hunger + 1);
            newState.thirst = Math.min(100, newState.thirst + 1);
            newState.cleanliness = Math.max(0, newState.cleanliness - 0.5);
            newState.sleepiness = Math.min(100, newState.sleepiness + 1);
          }
          
          // Verificar situações especiais com 80% de chance
          specialSituations.forEach(situation => {
            if (situation.condition(newState) && Math.random() < situation.chance) {
              // Aplicar efeitos
              Object.entries(situation.effects).forEach(([key, value]) => {
                if (key in newState) {
                  (newState as any)[key] = Math.max(0, Math.min(100, (newState as any)[key] + value));
                }
              });
              
              // Adicionar evento especial
              newState.specialEvents = [situation.name + ': ' + situation.description, ...newState.specialEvents.slice(0, 4)];
            }
          });
          
          return newState;
        });
      }, 1000 / gameState.gameSpeed);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.gameSpeed]);

  const handleObjectClick = (object: GameObject) => {
    if (!object.available(gameState)) return;
    if (object.lastUsed && gameState.time - object.lastUsed < (object.cooldown || 0)) return;

    setGameState(prevState => {
      const newState = { ...prevState };
      
      // Aplicar efeitos
      Object.entries(object.effects).forEach(([key, value]) => {
        if (key in newState) {
          (newState as any)[key] = Math.max(0, Math.min(100, (newState as any)[key] + value));
        }
      });
      
      // Avançar tempo
      newState.time += object.timeRequired;
      if (newState.time >= 24) {
        newState.time -= 24;
        newState.day += 1;
      }
      
      // Adicionar ação ao histórico
      newState.lastActions = [`${object.name} (${object.action})`, ...newState.lastActions.slice(0, 4)];
      
      // Marcar objeto como usado
      const objIndex = gameObjects.findIndex(obj => obj.id === object.id);
      if (objIndex !== -1) {
        gameObjects[objIndex].lastUsed = newState.time;
      }
      
      return newState;
    });
  };

  const togglePlayPause = () => {
    setGameState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const resetGame = () => {
    setGameState({
      energy: 80,
      happiness: 70,
      health: 85,
      hunger: 60,
      thirst: 70,
      cleanliness: 80,
      sleepiness: 30,
      time: 8,
      day: 1,
      currentRoom: 'bedroom',
      gameStyle: 'isometric',
      isPlaying: false,
      gameSpeed: 1,
      volume: 0.3,
      isMuted: false,
      lastActions: [],
      specialEvents: [],
      achievements: []
    });
  };

  const changeRoom = (room: typeof gameState.currentRoom) => {
    setGameState(prev => ({ ...prev, currentRoom: room }));
  };

  const toggleGameStyle = () => {
    setGameState(prev => ({ 
      ...prev, 
      gameStyle: prev.gameStyle === 'isometric' ? '2d' : 'isometric' 
    }));
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time);
    const minutes = Math.floor((time % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getStatColor = (value: number, reverse = false) => {
    if (reverse) {
      if (value <= 30) return 'text-emerald-400';
      if (value <= 60) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      if (value >= 70) return 'text-emerald-400';
      if (value >= 40) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  const getStatIcon = (stat: string) => {
    switch (stat) {
      case 'energy': return <Zap className="w-4 h-4" />;
      case 'happiness': return <Heart className="w-4 h-4" />;
      case 'health': return <Star className="w-4 h-4" />;
      case 'hunger': return <Utensils className="w-4 h-4" />;
      case 'thirst': return <Droplets className="w-4 h-4" />;
      case 'cleanliness': return <Sparkles className="w-4 h-4" />;
      case 'sleepiness': return <Moon className="w-4 h-4" />;
      default: return null;
    }
  };

  const renderGameArea = () => {
    const roomObjects = gameObjects.filter(obj => obj.room === gameState.currentRoom);
    
    return (
      <div className={`relative w-full h-96 rounded-xl overflow-hidden ${
        gameState.gameStyle === 'isometric' ? 'isometric-container' : 'pixel-game-container'
      }`}>
        {/* Room Background */}
        <div className={`${gameState.gameStyle === 'isometric' ? 'isometric-room' : 'pixel-room'} room-${gameState.currentRoom}`}>
          <div className={`${gameState.gameStyle === 'isometric' ? '' : 'pixel-room-bg'} room-bg-${gameState.currentRoom}`}>
            {gameState.gameStyle === 'isometric' && (
              <>
                <div className="isometric-floor"></div>
                <div className="isometric-wall-back"></div>
                <div className="isometric-wall-left"></div>
                <div className="isometric-wall-right"></div>
                <div className="isometric-lighting"></div>
              </>
            )}
          </div>
          
          {/* Objects */}
          {roomObjects.map(object => {
            const isAvailable = object.available(gameState);
            const isOnCooldown = object.lastUsed && gameState.time - object.lastUsed < (object.cooldown || 0);
            
            return (
              <div
                key={object.id}
                className={`${gameState.gameStyle === 'isometric' ? 'isometric-object' : 'pixel-object'} ${gameState.gameStyle === 'isometric' ? 'isometric-' : 'pixel-'}${object.id} ${
                  isAvailable && !isOnCooldown ? 'available' : 'used'
                }`}
                onClick={() => handleObjectClick(object)}
                title={`${object.name} - ${object.action}`}
              >
                {isAvailable && !isOnCooldown && (
                  <div className={`${gameState.gameStyle === 'isometric' ? 'isometric-completion' : 'pixel-completion'}`}>
                    ✓
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Character */}
          <div className={`${gameState.gameStyle === 'isometric' ? 'isometric-character' : 'pixel-character'}`}>
            <div className={`${gameState.gameStyle === 'isometric' ? 'alex-sprite-isometric alex-idle-iso' : 'alex-sprite-2d alex-idle-2d'}`}></div>
            <div className={`character-shadow${gameState.gameStyle === '2d' ? '-2d' : ''}`}></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950' 
        : 'bg-gradient-to-br from-white via-emerald-50/80 to-emerald-100/60'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-sm border-b transition-colors duration-300 ${
        isDark 
          ? 'bg-slate-900/95 border-slate-800' 
          : 'bg-white/95 border-gray-200'
      }`}>
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className={`p-2 rounded-full transition-colors ${
                isDark 
                  ? 'hover:bg-slate-800 text-white' 
                  : 'hover:bg-gray-100 text-gray-900'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Gamepad2 className="w-6 h-6 text-purple-400" />
              <h1 className={`text-xl font-bold transition-colors duration-300 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Dream Story</h1>
            </div>
            
            {/* Game Controls */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={togglePlayPause}
                className={`p-2 rounded-lg transition-colors ${
                  gameState.isPlaying 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {gameState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              
              <button
                onClick={resetGame}
                className={`p-2 rounded-lg transition-colors ${
                  isDark 
                    ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              
              <button
                onClick={toggleGameStyle}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDark 
                    ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                {gameState.gameStyle === 'isometric' ? '3D' : '2D'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Area */}
          <div className="lg:col-span-3">
            {/* Time and Day */}
            <div className={`flex items-center justify-between mb-4 p-4 rounded-xl transition-colors duration-300 ${
              isDark 
                ? 'bg-slate-900/50 border border-slate-800' 
                : 'bg-white/80 border border-gray-200 shadow-sm'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`text-2xl font-bold transition-colors duration-300 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Dia {gameState.day}
                </div>
                <div className={`text-xl font-mono transition-colors duration-300 ${
                  isDark ? 'text-emerald-400' : 'text-emerald-600'
                }`}>
                  {formatTime(gameState.time)}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-sm transition-colors duration-300 ${
                  isDark ? 'text-slate-400' : 'text-gray-600'
                }`}>
                  Velocidade: {gameState.gameSpeed}x
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.5"
                  value={gameState.gameSpeed}
                  onChange={(e) => setGameState(prev => ({ ...prev, gameSpeed: parseFloat(e.target.value) }))}
                  className="w-20"
                />
              </div>
            </div>

            {/* Room Navigation */}
            <div className={`flex flex-wrap gap-2 mb-4 p-4 rounded-xl transition-colors duration-300 ${
              isDark 
                ? 'bg-slate-900/50 border border-slate-800' 
                : 'bg-white/80 border border-gray-200 shadow-sm'
            }`}>
              {['bedroom', 'living', 'kitchen', 'gym', 'bathroom'].map(room => (
                <button
                  key={room}
                  onClick={() => changeRoom(room as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    gameState.currentRoom === room
                      ? 'bg-purple-500 text-white'
                      : isDark
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  {room === 'bedroom' && '🛏️ Quarto'}
                  {room === 'living' && '🛋️ Sala'}
                  {room === 'kitchen' && '🍳 Cozinha'}
                  {room === 'gym' && '💪 Academia'}
                  {room === 'bathroom' && '🚿 Banheiro'}
                </button>
              ))}
            </div>

            {/* Game Area */}
            {renderGameArea()}
          </div>

          {/* Stats Panel */}
          <div className="space-y-6">
            {/* Character Stats */}
            <div className={`p-6 rounded-xl transition-colors duration-300 ${
              isDark 
                ? 'bg-slate-900/50 border border-slate-800' 
                : 'bg-white/80 border border-gray-200 shadow-sm'
            }`}>
              <h3 className={`text-lg font-bold mb-4 transition-colors duration-300 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Status</h3>
              
              <div className="space-y-3">
                {[
                  { key: 'energy', label: 'Energia', value: gameState.energy },
                  { key: 'happiness', label: 'Felicidade', value: gameState.happiness },
                  { key: 'health', label: 'Saúde', value: gameState.health },
                  { key: 'hunger', label: 'Fome', value: gameState.hunger, reverse: true },
                  { key: 'thirst', label: 'Sede', value: gameState.thirst, reverse: true },
                  { key: 'cleanliness', label: 'Limpeza', value: gameState.cleanliness },
                  { key: 'sleepiness', label: 'Sono', value: gameState.sleepiness, reverse: true }
                ].map(stat => (
                  <div key={stat.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatIcon(stat.key)}
                      <span className={`text-sm transition-colors duration-300 ${
                        isDark ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        {stat.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-16 h-2 rounded-full transition-colors duration-300 ${
                        isDark ? 'bg-slate-700' : 'bg-gray-200'
                      }`}>
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            stat.reverse
                              ? stat.value <= 30 ? 'bg-emerald-500' : stat.value <= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              : stat.value >= 70 ? 'bg-emerald-500' : stat.value >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${stat.value}%` }}
                        />
                      </div>
                      <span className={`text-sm font-mono ${getStatColor(stat.value, stat.reverse)}`}>
                        {Math.round(stat.value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Events */}
            {gameState.specialEvents.length > 0 && (
              <div className={`p-6 rounded-xl transition-colors duration-300 ${
                isDark 
                  ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30' 
                  : 'bg-gradient-to-r from-purple-100/80 to-pink-100/60 border border-purple-300/50 shadow-sm'
              }`}>
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 transition-colors duration-300 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Eventos Especiais
                </h3>
                
                <div className="space-y-2">
                  {gameState.specialEvents.map((event, index) => (
                    <div
                      key={index}
                      className={`text-sm p-3 rounded-lg transition-colors duration-300 ${
                        isDark 
                          ? 'bg-slate-800/50 text-purple-300' 
                          : 'bg-purple-50/80 text-purple-700'
                      }`}
                    >
                      {event}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Actions */}
            {gameState.lastActions.length > 0 && (
              <div className={`p-6 rounded-xl transition-colors duration-300 ${
                isDark 
                  ? 'bg-slate-900/50 border border-slate-800' 
                  : 'bg-white/80 border border-gray-200 shadow-sm'
              }`}>
                <h3 className={`text-lg font-bold mb-4 transition-colors duration-300 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Ações Recentes</h3>
                
                <div className="space-y-2">
                  {gameState.lastActions.map((action, index) => (
                    <div
                      key={index}
                      className={`text-sm p-2 rounded transition-colors duration-300 ${
                        isDark 
                          ? 'bg-slate-800/50 text-slate-300' 
                          : 'bg-gray-100/80 text-gray-700'
                      }`}
                    >
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className={`p-6 rounded-xl transition-colors duration-300 ${
              isDark 
                ? 'bg-emerald-500/10 border border-emerald-500/30' 
                : 'bg-emerald-100/80 border border-emerald-300/50 shadow-sm'
            }`}>
              <h3 className={`text-lg font-bold mb-4 transition-colors duration-300 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Como Jogar</h3>
              
              <div className={`space-y-2 text-sm transition-colors duration-300 ${
                isDark ? 'text-slate-300' : 'text-gray-700'
              }`}>
                <p>• Clique nos objetos para interagir</p>
                <p>• Mantenha seus stats equilibrados</p>
                <p>• Explore diferentes cômodos</p>
                <p>• Situações especiais têm 80% de chance!</p>
                <p>• Use Play/Pause para controlar o tempo</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
      >
        <source src="/[KAIROSOFT SOUNDTRACKS] Game Dev Story Working Hard (1) (2).mp3" type="audio/mpeg" />
      </audio>
    </div>
  );
};

export default DreamStoryGame;