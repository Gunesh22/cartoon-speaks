import React, { useState } from 'react';
import { Character } from '../../types/character';
import { MouthCollection, MouthAsset } from '../../types/mouth';
import { CharacterCard } from './CharacterCard';
import { CharacterUpload } from './CharacterUpload';
import { CharacterEditor } from './CharacterEditor';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { Button } from '../common/Button';
import { Plus, Users, Search } from 'lucide-react';

export interface CharacterLibraryProps {
  characters: Character[];
  mouthCollections: MouthCollection[];
  getAssetsForCollection: (collectionId: string) => Promise<MouthAsset[]>;
  onCreateCharacter: (name: string, blob: Blob, width: number, height: number) => Promise<Character>;
  onUpdateCharacter: (
    id: string,
    placement: Character['placement'],
    mapping: Record<string, string>,
    mouthCollectionId?: string,
    name?: string,
    newImage?: {
      blob: Blob;
      width: number;
      height: number;
    }
  ) => Promise<void>;
  onDuplicateCharacter: (id: string) => Promise<Character | undefined>;
  onDeleteCharacter: (id: string) => Promise<void>;
  onSelectCharacter?: (character: Character) => void;
  selectedCharacterId?: string;
}

export const CharacterLibrary: React.FC<CharacterLibraryProps> = ({
  characters,
  mouthCollections,
  getAssetsForCollection,
  onCreateCharacter,
  onUpdateCharacter,
  onDuplicateCharacter,
  onDeleteCharacter,
  onSelectCharacter,
  selectedCharacterId,
}) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [charToDelete, setCharToDelete] = useState<Character | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCharacters = characters.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCollectionName = (colId?: string) => {
    if (!colId) return undefined;
    return mouthCollections.find((m) => m.id === colId)?.name;
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Character Library</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Create, manage, and configure talking cartoon characters with normalized mouth placement.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsUploadOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          New Character
        </Button>
      </div>

      {/* Filter / Search Bar */}
      {characters.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search characters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Grid or Empty State */}
      {filteredCharacters.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-indigo-500" />}
          title={characters.length === 0 ? 'No characters yet' : 'No matching characters'}
          description={
            characters.length === 0
              ? 'Upload a PNG character image to create your first talking avatar. Transparent backgrounds work best.'
              : 'Try clearing your search query to find your character.'
          }
          action={
            characters.length === 0 ? (
              <Button
                variant="primary"
                onClick={() => setIsUploadOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Upload Character
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredCharacters.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              isSelected={char.id === selectedCharacterId}
              mouthCollectionName={getCollectionName(char.mouthCollectionId)}
              onSelect={() => onSelectCharacter?.(char)}
              onEdit={() => setEditingChar(char)}
              onDuplicate={() => onDuplicateCharacter(char.id)}
              onDelete={() => setCharToDelete(char)}
            />
          ))}
        </div>
      )}

      {/* Create Upload Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Create New Character"
        description="Upload a transparent PNG, WebP, or JPEG of your character."
        maxWidth="md"
      >
        <CharacterUpload
          onUploadSuccess={async (name, blob, width, height) => {
            const newChar = await onCreateCharacter(name, blob, width, height);
            setIsUploadOpen(false);
            setEditingChar(newChar);
          }}
          onCancel={() => setIsUploadOpen(false)}
        />
      </Modal>

      {/* Edit Character Modal */}
      <Modal
        isOpen={!!editingChar}
        onClose={() => setEditingChar(null)}
        title="Configure Character & Mouth Placement"
        maxWidth="6xl"
      >
        {editingChar && (
          <CharacterEditor
            character={editingChar}
            mouthCollections={mouthCollections}
            getAssetsForCollection={getAssetsForCollection}
            onSave={async (placement, mapping, collectionId, name, newImage) => {
              await onUpdateCharacter(editingChar.id, placement, mapping, collectionId, name, newImage);
              setEditingChar(null);
            }}
            onClose={() => setEditingChar(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!charToDelete}
        title="Delete Character?"
        message={`Are you sure you want to delete "${charToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Character"
        onConfirm={async () => {
          if (charToDelete) {
            await onDeleteCharacter(charToDelete.id);
            setCharToDelete(null);
          }
        }}
        onCancel={() => setCharToDelete(null)}
      />
    </div>
  );
};
