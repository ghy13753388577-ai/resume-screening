import { useState, KeyboardEvent, ReactNode } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  recommendations?: string[];
  toggle?: ReactNode;
  libraries?: { label: string; keywords: string[] }[];
  isKillSwitchActive?: boolean;
}

export function TagInput({ label, tags, onChange, placeholder, recommendations, toggle, libraries, isKillSwitchActive }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!tags.includes(inputValue.trim())) {
        onChange([...tags, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">{label}</label>
        {toggle}
      </div>
      <div className={cn(
        "flex flex-wrap gap-2 p-2 min-h-[46px] bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all",
        isKillSwitchActive && "bg-red-50/50 border-red-200 ring-red-500"
      )}>
        {Array.isArray(tags) && tags.map((tag, index) => (
          <span key={index} className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 group">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-indigo-800">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 outline-none text-sm text-gray-600 min-w-[120px] bg-transparent"
        />
      </div>
      
      {recommendations && recommendations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mr-1">
            <Sparkles size={10} /> 智能推荐:
          </span>
          {recommendations.map((rec, i) => (
            <button
              key={i}
              onClick={() => !tags.includes(rec) && onChange([...tags, rec])}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border transition-all",
                tags.includes(rec) 
                  ? "bg-indigo-100 border-indigo-200 text-indigo-600 cursor-default" 
                  : "bg-white border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-500"
              )}
            >
              {rec}
            </button>
          ))}
        </div>
      )}

      {libraries && (
        <div className="flex flex-wrap gap-2 mt-2">
          {libraries.map((lib, i) => (
            <div key={i} className="space-y-1">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{lib.label}</p>
              <div className="flex flex-wrap gap-1">
                {lib.keywords.slice(0, 5).map((item, j) => (
                  <button
                    key={j}
                    onClick={() => !tags.includes(item) && onChange([...tags, item])}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
