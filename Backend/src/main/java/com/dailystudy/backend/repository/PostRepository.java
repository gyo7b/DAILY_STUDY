package com.dailystudy.backend.repository;

import com.dailystudy.backend.model.Post;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface RepositorioPost extends MongoRepository<Post, String> {

    // Ordena os posts por data de criacao
    static List<Post> findAllByOrderByDataCriacaoDesc();
}
