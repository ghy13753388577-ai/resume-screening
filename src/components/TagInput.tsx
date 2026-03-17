import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  recommendations?: string[];
  label?: string;
}

export function TagInput({ tags, onChange, placeholder, recommendations, label }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().replace(/,$/, '');
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag]);
      setInputValue('');
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>}
      
      <div className="flex flex-wrap gap-2 p-2 bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all min-h-[46px]">
        {tags.map((tag, index) => (
          <span 
            key={index} 
            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium animate-in fade-in zoom-in duration-200"
          >
            {tag}
            <button 
              onClick={() => removeTag(index)}
              className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
            >
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(inputValue)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 outline-none text-sm min-w-[120px] bg-transparent"
        />
      </div>

      {recommendations && recommendations.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] text-gray-400 font-medium uppercase">建议:</span>
          {recommendations.filter(r => !tags.includes(r)).map((rec, i) => (
            <button
              key={i}
              onClick={() => addTag(rec)}
              className="text-[11px] px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors flex items-center gap-1"
            >
              <Plus size={10} />
              {rec}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
