'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Edit, Plus, Save, X } from 'lucide-react';
import { Suspense, useState } from 'react';
import { EmployeeFormSkeleton } from './skeletons/employee-form-skeleton';

interface EmployeeSkillsProps {
  employeeId: string;
  isEditable?: boolean;
}

// Mock data for skills - replace with actual data fetching
const mockSkills = [
  {
    id: '1',
    aptitud_id: 'e9f31136-edc2-41ff-9bce-57cd18db9a25',
    aptitudes_tecnicas: {
      id: '1',
      name: 'Soldadura',
      category: 'Técnica',
    },
  },
  {
    id: '2',
    aptitud_id: 'f8e21136-edc2-41ff-9bce-57cd18db9a26',
    aptitudes_tecnicas: {
      id: '2',
      name: 'Manejo de Grúa',
      category: 'Operativa',
    },
  },
];

async function EmployeeSkillsContent({ employeeId, isEditable = true }: EmployeeSkillsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [skills, setSkills] = useState(mockSkills);

  const handleAddSkill = () => {
    // Logic to add new skill
    console.log('Add skill');
  };

  const handleRemoveSkill = (skillId: string) => {
    setSkills(skills.filter((skill) => skill.id !== skillId));
  };

  const handleSave = () => {
    // Logic to save skills
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset changes
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Aptitudes y Habilidades
        </CardTitle>
        {isEditable && !isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {skills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay aptitudes registradas</p>
            {isEditable && (
              <Button variant="outline" size="sm" className="mt-4 bg-transparent" onClick={handleAddSkill}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar primera aptitud
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Skills List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.map((skill) => (
                <div key={skill.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">{skill.aptitudes_tecnicas.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {skill.aptitudes_tecnicas.category}
                      </Badge>
                    </div>
                  </div>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSkill(skill.id)}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Skill Button */}
            {isEditing && (
              <Button variant="outline" onClick={handleAddSkill} className="w-full bg-transparent">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Aptitud
              </Button>
            )}

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EmployeeSkills(props: EmployeeSkillsProps) {
  return (
    <Suspense fallback={<EmployeeFormSkeleton />}>
      <EmployeeSkillsContent {...props} />
    </Suspense>
  );
}
