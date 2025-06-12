import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSupabase } from '../lib/supabase-context';

const AddTechnician = () => {
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    hireDate: '',
    jobTitle: '',
    hourlyRate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
    skills: [{ name: '', proficiency: 'beginner', yearsExperience: '' }],
    certifications: [{
      name: '',
      organization: '',
      number: '',
      issueDate: '',
      expiryDate: '',
    }],
    availability: Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: i < 5 // Monday-Friday by default
    })),
    territories: [{
      name: '',
      state: '',
      zipCodes: '',
      isPrimary: false
    }]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // First, create the user in Supabase Authentication
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!'; // Generate a temporary password
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: 'technician'
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        throw new Error(`Failed to create user account: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('No user data returned from authentication');
      }

      // Create username from email (part before @)
      const username = formData.email.split('@')[0];

      // Insert user into public.users table using the auth user's ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id, // Use the auth user's ID
          username: username,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone || null,
          role: 'technician',
          is_active: true
        })
        .select()
        .single();

      if (userError) {
        console.error('Error creating user record:', userError);
        // If user creation fails, we should clean up the auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Failed to create user record: ${userError.message}`);
      }

      // Insert technician record
      const { data: techData, error: techError } = await supabase
        .from('technicians')
        .insert({
          user_id: authData.user.id, // Use the auth user's ID
          employee_id: formData.employeeId || null,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone || null,
          hire_date: formData.hireDate,
          job_title: formData.jobTitle,
          hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
          emergency_contact_name: formData.emergencyContactName || null,
          emergency_contact_phone: formData.emergencyContactPhone || null,
          notes: formData.notes || null,
          status: 'active'
        })
        .select()
        .single();

      if (techError) {
        console.error('Error creating technician record:', techError);
        // Clean up auth user and user record if technician creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Failed to create technician record: ${techError.message}`);
      }

      if (!techData) throw new Error('No technician data returned');

      // Insert skills
      const skillsToInsert = formData.skills
        .filter(skill => skill.name)
        .map(skill => ({
          technician_id: techData.id,
          skill_name: skill.name,
          proficiency_level: skill.proficiency,
          years_experience: skill.yearsExperience ? parseInt(skill.yearsExperience) : null
        }));

      if (skillsToInsert.length > 0) {
        const { error: skillsError } = await supabase
          .from('technician_skills')
          .insert(skillsToInsert);

        if (skillsError) throw skillsError;
      }

      // Insert certifications
      const certsToInsert = formData.certifications
        .filter(cert => cert.name)
        .map(cert => ({
          technician_id: techData.id,
          certification_name: cert.name,
          issuing_organization: cert.organization,
          certification_number: cert.number || null,
          issue_date: cert.issueDate,
          expiry_date: cert.expiryDate || null,
          status: 'active'
        }));

      if (certsToInsert.length > 0) {
        const { error: certsError } = await supabase
          .from('technician_certifications')
          .insert(certsToInsert);

        if (certsError) throw certsError;
      }

      // Insert availability
      const availabilityToInsert = formData.availability
        .filter(avail => avail.isAvailable)
        .map(avail => ({
          technician_id: techData.id,
          day_of_week: avail.dayOfWeek,
          start_time: avail.startTime,
          end_time: avail.endTime,
          is_available: true
        }));

      if (availabilityToInsert.length > 0) {
        const { error: availError } = await supabase
          .from('technician_availability')
          .insert(availabilityToInsert);

        if (availError) throw availError;
      }

      // Insert territories
      const territoriesToInsert = formData.territories
        .filter(terr => terr.name && terr.state)
        .map(terr => ({
          technician_id: techData.id,
          territory_name: terr.name,
          state: terr.state,
          zip_codes: terr.zipCodes.split(',').map(zip => zip.trim()),
          is_primary: terr.isPrimary
        }));

      if (territoriesToInsert.length > 0) {
        const { error: terrError } = await supabase
          .from('technician_territories')
          .insert(territoriesToInsert);

        if (terrError) throw terrError;
      }

      navigate('/jobs/dispatch');
    } catch (err) {
      console.error('Error adding technician:', err);
      setError(err instanceof Error ? err.message : 'Failed to add technician. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSkill = () => {
    setFormData(prev => ({
      ...prev,
      skills: [...prev.skills, { name: '', proficiency: 'beginner', yearsExperience: '' }]
    }));
  };

  const removeSkill = (index: number) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const addCertification = () => {
    setFormData(prev => ({
      ...prev,
      certifications: [...prev.certifications, {
        name: '',
        organization: '',
        number: '',
        issueDate: '',
        expiryDate: ''
      }]
    }));
  };

  const removeCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const addTerritory = () => {
    setFormData(prev => ({
      ...prev,
      territories: [...prev.territories, {
        name: '',
        state: '',
        zipCodes: '',
        isPrimary: false
      }]
    }));
  };

  const removeTerritory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      territories: prev.territories.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/jobs/dispatch" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1>Add Technician</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-error-50 text-error-700 p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-6">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID
              </label>
              <input
                type="text"
                id="employeeId"
                value={formData.employeeId}
                onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="hireDate" className="block text-sm font-medium text-gray-700 mb-1">
                Hire Date *
              </label>
              <input
                type="date"
                id="hireDate"
                value={formData.hireDate}
                onChange={(e) => setFormData(prev => ({ ...prev, hireDate: e.target.value }))}
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
                Job Title *
              </label>
              <input
                type="text"
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
                Hourly Rate
              </label>
              <input
                type="number"
                id="hourlyRate"
                value={formData.hourlyRate}
                onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                step="0.01"
                min="0"
                className="input"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-6">Emergency Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                id="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                id="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                className="input"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium">Skills</h2>
            <button
              type="button"
              onClick={addSkill}
              className="btn btn-secondary btn-sm"
            >
              Add Skill
            </button>
          </div>
          
          {formData.skills.map((skill, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skill Name
                </label>
                <input
                  type="text"
                  value={skill.name}
                  onChange={(e) => {
                    const newSkills = [...formData.skills];
                    newSkills[index].name = e.target.value;
                    setFormData(prev => ({ ...prev, skills: newSkills }));
                  }}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proficiency Level
                </label>
                <select
                  value={skill.proficiency}
                  onChange={(e) => {
                    const newSkills = [...formData.skills];
                    newSkills[index].proficiency = e.target.value;
                    setFormData(prev => ({ ...prev, skills: newSkills }));
                  }}
                  className="select"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years Experience
                  </label>
                  <input
                    type="number"
                    value={skill.yearsExperience}
                    onChange={(e) => {
                      const newSkills = [...formData.skills];
                      newSkills[index].yearsExperience = e.target.value;
                      setFormData(prev => ({ ...prev, skills: newSkills }));
                    }}
                    min="0"
                    className="input"
                  />
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removeSkill(index)}
                    className="btn btn-error mb-[1px]"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium">Certifications</h2>
            <button
              type="button"
              onClick={addCertification}
              className="btn btn-secondary btn-sm"
            >
              Add Certification
            </button>
          </div>
          
          {formData.certifications.map((cert, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certification Name
                </label>
                <input
                  type="text"
                  value={cert.name}
                  onChange={(e) => {
                    const newCerts = [...formData.certifications];
                    newCerts[index].name = e.target.value;
                    setFormData(prev => ({ ...prev, certifications: newCerts }));
                  }}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issuing Organization
                </label>
                <input
                  type="text"
                  value={cert.organization}
                  onChange={(e) => {
                    const newCerts = [...formData.certifications];
                    newCerts[index].organization = e.target.value;
                    setFormData(prev => ({ ...prev, certifications: newCerts }));
                  }}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certification Number
                </label>
                <input
                  type="text"
                  value={cert.number}
                  onChange={(e) => {
                    const newCerts = [...formData.certifications];
                    newCerts[index].number = e.target.value;
                    setFormData(prev => ({ ...prev, certifications: newCerts }));
                  }}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={cert.issueDate}
                  onChange={(e) => {
                    const newCerts = [...formData.certifications];
                    newCerts[index].issueDate = e.target.value;
                    setFormData(prev => ({ ...prev, certifications: newCerts }));
                  }}
                  className="input"
                />
              </div>

              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={cert.expiryDate}
                    onChange={(e) => {
                      const newCerts = [...formData.certifications];
                      newCerts[index].expiryDate = e.target.value;
                      setFormData(prev => ({ ...prev, certifications: newCerts }));
                    }}
                    className="input"
                  />
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removeCertification(index)}
                    className="btn btn-error mb-[1px]"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-6">Availability</h2>
          <div className="space-y-4">
            {formData.availability.map((avail, index) => {
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-32">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={avail.isAvailable}
                        onChange={(e) => {
                          const newAvail = [...formData.availability];
                          newAvail[index].isAvailable = e.target.checked;
                          setFormData(prev => ({ ...prev, availability: newAvail }));
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2">{days[index]}</span>
                    </label>
                  </div>

                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={avail.startTime}
                          onChange={(e) => {
                            const newAvail = [...formData.availability];
                            newAvail[index].startTime = e.target.value;
                            setFormData(prev => ({ ...prev, availability: newAvail }));
                          }}
                          disabled={!avail.isAvailable}
                          className="input"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={avail.endTime}
                          onChange={(e) => {
                            const newAvail = [...formData.availability];
                            newAvail[index].endTime = e.target.value;
                            setFormData(prev => ({ ...prev, availability: newAvail }));
                          }}
                          disabled={!avail.isAvailable}
                          className="input"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium">Service Territories</h2>
            <button
              type="button"
              onClick={addTerritory}
              className="btn btn-secondary btn-sm"
            >
              Add Territory
            </button>
          </div>
          
          {formData.territories.map((territory, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Territory Name
                </label>
                <input
                  type="text"
                  value={territory.name}
                  onChange={(e) => {
                    const newTerritories = [...formData.territories];
                    newTerritories[index].name = e.target.value;
                    setFormData(prev => ({ ...prev, territories: newTerritories }));
                  }}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={territory.state}
                  onChange={(e) => {
                    const newTerritories = [...formData.territories];
                    newTerritories[index].state = e.target.value;
                    setFormData(prev => ({ ...prev, territories: newTerritories }));
                  }}
                  maxLength={2}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Codes (comma-separated)
                </label>
                <input
                  type="text"
                  value={territory.zipCodes}
                  onChange={(e) => {
                    const newTerritories = [...formData.territories];
                    newTerritories[index].zipCodes = e.target.value;
                    setFormData(prev => ({ ...prev, territories: newTerritories }));
                  }}
                  placeholder="30303, 30305, 30309"
                  className="input"
                />
              </div>

              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={territory.isPrimary}
                      onChange={(e) => {
                        const newTerritories = [...formData.territories];
                        newTerritories[index].isPrimary = e.target.checked;
                        setFormData(prev => ({ ...prev, territories: newTerritories }));
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2">Primary Territory</span>
                  </label>
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removeTerritory(index)}
                    className="btn btn-error mb-[1px]"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-6">Additional Notes</h2>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="input"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Link
            to="/jobs/dispatch"
            className="btn btn-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                Adding Technician...
              </>
            ) : (
              'Add Technician'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTechnician;