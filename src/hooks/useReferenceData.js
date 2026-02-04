import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'

export const useReferenceData = () => {
    const [locations, setLocations] = useState([])
    const [staff, setStaff] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchLocations = async () => {
        const { data, error } = await supabase
            .from('locations')
            .select('*, is_storage')
            .order('name')

        if (error) console.error('Error fetching locations:', error)
        else setLocations(data || [])
    }

    const fetchStaff = async () => {
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .eq('is_active', true)
            .order('nama')

        if (error) console.error('Error fetching staff:', error)
        else setStaff(data || [])
    }

    const refreshData = async () => {
        setLoading(true)
        await Promise.all([fetchLocations(), fetchStaff()])
        setLoading(false)
    }

    useEffect(() => {
        refreshData()
    }, [])

    return { locations, staff, loading, refreshData }
}
